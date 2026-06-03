import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { EmbeddingsService } from '../embeddings/embeddings.service';

@Injectable()
export class RetrievalService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly embeddingsService: EmbeddingsService,
  ) {}

  async searchByVideo(question: string, videoId: string, limit = 10) {
    const embedding = await this.embeddingsService.embedText(question);

    const vectorString = `[${embedding.join(',')}]`;

    return this.dataSource.query(
      `
      SELECT
        id,
        video_id,
        chunk_number,
        content,

        1 - (
          embedding <=> $1::vector
        ) AS similarity

      FROM transcript_chunks

      WHERE video_id = $2

      ORDER BY embedding <=> $1::vector

      LIMIT $3
      `,
      [vectorString, videoId, limit],
    );
  }

  async searchHooks(videoId: string) {
    const hookQuery = 'video hook opening first 5 seconds introduction';

    return this.searchByVideo(hookQuery, videoId, 6);
  }

  async getChunkById(chunkId: string) {
    const result = await this.dataSource.query(
      `
        SELECT *
        FROM transcript_chunks
        WHERE id = $1
        `,
      [chunkId],
    );

    return result[0];
  }

  async getChunksForVideo(videoId: string) {
    return this.dataSource.query(
      `
      SELECT
        id,
        chunk_number,
        content

      FROM transcript_chunks

      WHERE video_id = $1

      ORDER BY chunk_number
      `,
      [videoId],
    );
  }
}
