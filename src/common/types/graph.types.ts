export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface ChunkedTranscript {
  content: string;
  startTime: number | null;
  endTime: number | null;
  chunkIndex: number;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  startTime: number | null;
  endTime: number | null;
  similarity: number;
}

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnswerRequest {
  sessionId: string;
  videoId: string;
  question: string;
  history?: ChatHistoryItem[];
}
