import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { StateGraph, START, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';

import { GraphAnnotation, GraphState, GraphUpdate } from './graph.types';
import { RetrievalService } from '../retrieval/retrieval.service';
import { ChatService } from '@app/chat/chat.service';
import { VideosService } from '@app/videos/videos.service';

type CompiledGraph = ReturnType<
  StateGraph<typeof GraphAnnotation.spec>['compile']
>;

@Injectable()
export class LangGraphService {
  private readonly logger = new Logger(LangGraphService.name);
  private readonly llm: ChatOpenAI;
  private graph: CompiledGraph;

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
      temperature: 0.2,
    });
  }

  async run(input: GraphUpdate): Promise<GraphState> {
    return this.graph.invoke(input);
  }

  async stream(input: GraphUpdate) {
    return this.graph.stream(input);
  }

  // Graph Construction
  private async buildGraph(): Promise<CompiledGraph> {
    const graph = new StateGraph(GraphAnnotation);

    graph
      .addNode('loadHistory', (state) => this.loadHistoryNode(state))
      .addNode('retrieve', (state) => this.retrieveNode(state))
      .addNode('answer', (state) => this.answerNode(state))
      .addEdge(START, 'loadHistory')
      .addEdge('loadHistory', 'retrieve')
      .addEdge('retrieve', 'answer')
      .addEdge('answer', END);

    return graph.compile();
  }

  private async loadHistoryNode(state: GraphState): Promise<GraphUpdate> {
    const messages = await this.chatService.getSessionMessages(state.sessionId);

    const chatHistory = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    return { chatHistory };
  }

  private async retrieveNode(state: GraphState): Promise<GraphUpdate> {
    const chunks = await this.retrievalService.searchByVideo(
      state.question,
      state.videoId as string,
    );

    return chunks;
  }

  private async answerNode(state: GraphState): Promise<GraphUpdate> {
    const response = await this.llm.invoke(this.buildPrompt(state));
    return { answer: response.content as string };
  }

  // ─── Prompt Builder ────────────────────────────────────────────────────────

  private buildPrompt(state: GraphState): string {
    return `
You answer questions only using the provided YouTube transcript context. If the answer is not in the context, say you could not find it in the video. Keep the response grounded and concise. Always use all available information to answer the question. Do not make assumptions. If you don't know the answer, say you don't know.

Question:
${state.question}

Chat history:
${JSON.stringify(state.chatHistory ?? [])}

Retrieved transcript chunks:
${JSON.stringify(state.chunks ?? [])}
    `.trim();
  }
}
