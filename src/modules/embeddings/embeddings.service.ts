import { Injectable, Logger } from '@nestjs/common';
import { OpenAIEmbeddings } from '@langchain/openai';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly embeddings: OpenAIEmbeddings;

  constructor() {
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

    this.embeddings = new OpenAIEmbeddings({
      configuration: {
        baseURL,
        apiKey,
      },
      model,
    });
  }

  async embedText(text: string): Promise<number[]> {
    const cleaned = this.cleanText(text);
    if (!cleaned) return [];
    return this.embeddings.embedQuery(cleaned);
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const cleanedTexts = texts.map((t) => this.cleanText(t)).filter(Boolean);
    if (cleanedTexts.length === 0) return [];
    return this.embeddings.embedDocuments(cleanedTexts);
  }

  private cleanText(text: string): string {
    return (
      (text || '')
        .replace(/\s+/g, ' ')
        // eslint-disable-next-line no-control-regex
        .replace(/\u0000/g, '')
        .trim()
    );
  }
}
