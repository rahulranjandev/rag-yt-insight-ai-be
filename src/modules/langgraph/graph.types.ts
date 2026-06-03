import { Annotation } from '@langchain/langgraph';

export type ChatHistoryItem = {
  role: string;
  content: string;
};

export const GraphAnnotation = Annotation.Root({
  sessionId: Annotation<string>(),
  question: Annotation<string>(),
  videoId: Annotation<string | null>(),
  chatHistory: Annotation<ChatHistoryItem[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  chunks: Annotation<any[] | undefined>(),
  answer: Annotation<string | undefined>(),
  error: Annotation<string | undefined>(),
});

export type GraphState = typeof GraphAnnotation.State;
export type GraphUpdate = typeof GraphAnnotation.Update;
