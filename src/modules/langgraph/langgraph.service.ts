import {
  Injectable,
  Logger,
  Inject,
  forwardRef,
  OnModuleInit,
} from '@nestjs/common';
import { StateGraph, START, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

import { GraphAnnotation, GraphState, GraphUpdate } from './graph.types';
import { RetrievalService } from '../retrieval/retrieval.service';
import { ChatService } from '@app/chat/chat.service';
import { VideosService } from '@app/videos/videos.service';
import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from '@langchain/core/messages';

type CompiledGraph = ReturnType<
  StateGraph<typeof GraphAnnotation.spec>['compile']
>;

const SYSTEM_PROMPT = `You answer questions only using the provided YouTube transcript context.
If the answer is not in the context, say you could not find it in the video.
Keep the response grounded and concise. Do not make assumptions.`;

// Bound how much history/context we feed the model per turn.
const MAX_HISTORY_MESSAGES = 12;
const MAX_CHUNKS = 8;

@Injectable()
export class LangGraphService implements OnModuleInit {
  private readonly logger = new Logger(LangGraphService.name);
  private readonly llm: ChatOpenAI;
  private graph?: CompiledGraph;
  private graphPromise?: Promise<CompiledGraph>;

  constructor(
    private readonly retrievalService: RetrievalService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    @Inject(forwardRef(() => VideosService))
    private readonly videosService: VideosService,
  ) {
    const model = process.env.OPENAI_MODEL;
    if (!model) {
      throw new Error('OPENAI_MODEL is not set');
    }

    const baseURL = process.env.OPENAI_BASE_URL;
    if (!baseURL) {
      throw new Error('OPENAI_BASE_URL is not set');
    }
    this.logger.log(`Using OpenAI API base URL: ${baseURL}`);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    this.llm = new ChatOpenAI({
      configuration: {
        baseURL,
        apiKey,
      },
      model,
      temperature: 1,
      topP: 0.95,
      maxTokens: 16384,
    });
  }

  async onModuleInit() {
    await this.getGraph();
  }

  async run(input: GraphUpdate, signal?: AbortSignal): Promise<GraphState> {
    const graph = await this.getGraph();
    const state = await graph.invoke(input, { signal });

    const response = await this.llm.invoke(this.buildPrompt(state), {
      signal,
    });

    return { ...state, answer: this.contentToText(response.content) };
  }

  async *stream(
    input: GraphUpdate,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const streamStartedAt = Date.now();
    const graph = await this.getGraph();
    const state = await graph.invoke(input, { signal });
    this.logger.log(
      `Prepared chat stream for session ${input.sessionId} in ${Date.now() - streamStartedAt}ms`,
    );

    const llmStartedAt = Date.now();
    const llmStream = await this.llm.stream(this.buildPrompt(state), {
      signal,
    });
    this.logger.log(
      `Opened LLM stream for session ${input.sessionId} in ${Date.now() - llmStartedAt}ms`,
    );

    let firstTokenLogged = false;
    try {
      for await (const chunk of llmStream) {
        if (signal?.aborted) {
          return;
        }
        const token = this.contentToText(chunk.content);
        if (token) {
          if (!firstTokenLogged) {
            firstTokenLogged = true;
            this.logger.log(
              `Received first LLM token for session ${input.sessionId} in ${Date.now() - streamStartedAt}ms`,
            );
          }
          yield token;
        }
      }
    } finally {
      this.logger.log(
        `Finished LLM stream for session ${input.sessionId} in ${Date.now() - streamStartedAt}ms`,
      );
    }
  }

  // Graph Construction
  private async buildGraph(): Promise<CompiledGraph> {
    const graph = new StateGraph(GraphAnnotation);

    graph
      .addNode('loadHistory', (state) => this.loadHistoryNode(state))
      .addNode('retrieve', (state) => this.retrieveNode(state))
      .addEdge(START, 'loadHistory')
      .addEdge('loadHistory', 'retrieve')
      .addEdge('retrieve', END);

    return graph.compile();
  }

  private async loadHistoryNode(state: GraphState): Promise<GraphUpdate> {
    const startedAt = Date.now();
    try {
      const messages = await this.chatService.getSessionMessages(
        state.sessionId,
      );

      const chatHistory = messages.slice(-MAX_HISTORY_MESSAGES).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      this.logger.log(
        `Loaded ${chatHistory.length} history messages for session ${state.sessionId} in ${Date.now() - startedAt}ms`,
      );
      return { chatHistory };
    } catch (error) {
      this.logger.error(
        `Failed to load history for session ${state.sessionId}`,
        (error as Error).stack,
      );
      // Degrade gracefully rather than failing the whole request over history.
      return { chatHistory: [] };
    }
  }

  private async retrieveNode(state: GraphState): Promise<GraphUpdate> {
    const startedAt = Date.now();
    try {
      const chunks = await this.retrievalService.searchByVideo(
        state.question,
        state.videoId as string,
      );

      this.logger.log(
        `Retrieved ${chunks.length} transcript chunks for session ${state.sessionId} in ${Date.now() - startedAt}ms`,
      );
      return { chunks: chunks.slice(0, MAX_CHUNKS) };
    } catch (error) {
      this.logger.error(
        `Retrieval failed for video ${state.videoId}`,
        (error as Error).stack,
      );
      // Let the LLM answer "not found in context" rather than hard-failing.
      return { chunks: [] };
    }
  }

  private async getGraph(): Promise<CompiledGraph> {
    if (!this.graph) {
      this.graph = await this.buildGraph();
    }

    return this.graph;
  }

  private contentToText(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }

    if (!Array.isArray(content)) {
      return '';
    }

    return content
      .map((part) => {
        if (
          typeof part === 'object' &&
          part !== null &&
          'text' in part &&
          typeof part.text === 'string'
        ) {
          return part.text;
        }
        return '';
      })
      .join('');
  }

  // ─── Prompt Builder ────────────────────────────────────────────────────────

  private buildPrompt(state: GraphState): BaseMessage[] {
    const transcriptContext = state.chunks?.length
      ? state.chunks
          .map((chunk, i) => `[${i + 1}] ${JSON.stringify(chunk)}`)
          .join('\n')
      : 'No relevant transcript chunks were found for this question.';

    const historyMessages: BaseMessage[] = (state.chatHistory ?? []).map((m) =>
      m.role === 'user'
        ? new HumanMessage(m.content)
        : new AIMessage(m.content),
    );

    return [
      new SystemMessage(
        `${SYSTEM_PROMPT}\n\nRetrieved transcript chunks:\n${transcriptContext}`,
      ),
      ...historyMessages,
      new HumanMessage(state.question),
    ];
  }
}
