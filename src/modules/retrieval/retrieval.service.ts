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
        "videoId",
        "chunkIndex",
        content,
        1 - (
          embedding::halfvec(2048) <=> $1::halfvec(2048)
        ) AS similarity
      FROM transcript_chunks
      WHERE "videoId" = $2
      ORDER BY embedding::halfvec(2048) <=> $1::halfvec(2048)
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
        "chunkIndex",
        content
      FROM transcript_chunks
      WHERE "videoId" = $1
      ORDER BY "chunkIndex"
      `,
      [videoId],
    );
  }
}
