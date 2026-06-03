import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TranscriptChunk } from '@app/entities/transcript-chunks.entity';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

@Injectable()
export class ChunkService {
  private readonly logger = new Logger(ChunkService.name);

  constructor(
    @InjectRepository(TranscriptChunk)
    private readonly embeddingsService: EmbeddingsService,
    private readonly dataSource: DataSource,
  ) {}

  private cleanText(text: string): string {
    return (
      text
        .replace(/\s+/g, ' ')
        // eslint-disable-next-line no-control-regex
        .replace(/\u0000/g, '')
        .trim()
    );
  }

  private toVectorString(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  async splitTranscript(transcript: string): Promise<string[]> {
    const cleanedTranscript = this.cleanText(transcript);

    this.logger.debug(
      `Cleaned transcript length: ${cleanedTranscript.length} characters`,
    );
    if (!cleanedTranscript) {
      this.logger.warn('Transcript is empty after cleaning');
      return [];
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
      separators: ['\n\n', '\n', '. ', '! ', '? ', ' ', ''],
    });

    this.logger.debug(
      `Splitting transcript into chunks with chunk size 500 and overlap 100`,
    );

    return splitter.splitText(transcript);
  }

  async chunkAndEmbedTranscript(videoId: string, transcript: string) {
    this.logger.log(`Chunking and embedding transcript for video ${videoId}`);
    const chunks = await this.splitTranscript(transcript);

    await this.deleteChunksByVideoId(videoId);

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i]!.trim();
      if (!content) continue;

      const embedding = await this.embeddingsService.embedText(content);
      this.logger.debug(
        `Chunk ${i + 1}/${chunks.length} embedding generated for video ${videoId}`,
      );

      await this.dataSource.query(
        `
        INSERT INTO transcript_chunks (
          id,
          video_id,
          chunk_number,
          content,
          embedding
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4::vector
        )
        `,
        [videoId, i + 1, content, this.toVectorString(embedding)],
      );
    }

    this.logger.log(
      `Finished chunking and embedding transcript for video ${videoId}`,
    );
    return {
      videoId,
      chunkCount: chunks.length,
    };
  }

  async getChunksByVideoId(videoId: string) {
    this.logger.log(`Fetching chunks for video ${videoId}`);
    return this.dataSource.query(
      `
      SELECT
        id,
        video_id,
        chunk_number,
        content,
        created_at
      FROM transcript_chunks
      WHERE video_id = $1
      ORDER BY chunk_number ASC
      `,
      [videoId],
    );
  }

  async deleteChunksByVideoId(videoId: string): Promise<void> {
    this.logger.log(`Deleting chunks for video ${videoId}`);
    await this.dataSource.query(
      `DELETE FROM transcript_chunks WHERE video_id = $1`,
      [videoId],
    );
  }
}
