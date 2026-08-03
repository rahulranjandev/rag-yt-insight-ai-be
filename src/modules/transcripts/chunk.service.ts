import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { TranscriptChunk } from '@app/entities/transcript-chunks.entity';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

@Injectable()
export class ChunkService {
  private readonly logger = new Logger(ChunkService.name);

  constructor(
    @InjectRepository(TranscriptChunk)
    private readonly transcriptChunkRepository: Repository<TranscriptChunk>,
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

    if (!cleanedTranscript) {
      this.logger.warn('Transcript is empty after cleaning');
      return [];
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 500,
      chunkOverlap: 100,
      separators: ['\n\n', '\n', '. ', '! ', '? ', ' ', ''],
    });

    return splitter.splitText(cleanedTranscript);
  }

  async chunkAndEmbedTranscript(videoId: string, transcript: string) {
    const chunks = await this.splitTranscript(transcript);

    await this.deleteChunksByVideoId(videoId);

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i]!.trim();
      if (!content) continue;

      const embedding = await this.embeddingsService.embedText(content);

      // Use raw SQL to insert with pgvector casting — TypeORM doesn't support ::vector cast natively
      await this.dataSource.query(
        `
        INSERT INTO transcript_chunks (
          id,
          "videoId",
          "chunkIndex",
          content,
          "startTime",
          "endTime",
          embedding
        )
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          $3,
          $4,
          $5,
          $6::vector
        )
      `,
        [videoId, i + 1, content, 0, 0, this.toVectorString(embedding)],
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

    return await this.transcriptChunkRepository
      .createQueryBuilder('chunk')
      .select([
        'chunk.id',
        'chunk.videoId',
        'chunk.chunkIndex',
        'chunk.content',
        'chunk.createdAt',
      ])
      .where('chunk.videoId = :videoId', { videoId })
      .getMany();
  }

  async deleteChunksByVideoId(videoId: string): Promise<void> {
    await this.transcriptChunkRepository.delete({ videoId });
  }
}
