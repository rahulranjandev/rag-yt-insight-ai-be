import { Annotation } from '@langchain/langgraph';

export type ChatRole = 'user' | 'assistant';

export type ChatHistoryItem = {
  role: ChatRole;
  content: string;
};

export type TranscriptChunk = {
  text: string;
  /** Seconds into the video where this chunk starts. */
  startSeconds: number;
  endSeconds?: number;
};

export const GraphAnnotation = Annotation.Root({
  sessionId: Annotation<string>(),
  question: Annotation<string>(),
  videoId: Annotation<string | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  chatHistory: Annotation<ChatHistoryItem[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  chunks: Annotation<TranscriptChunk[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  answer: Annotation<string | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
  error: Annotation<string | undefined>({
    reducer: (_left, right) => right,
    default: () => undefined,
  }),
});

export type GraphState = typeof GraphAnnotation.State;
export type GraphUpdate = typeof GraphAnnotation.Update;
