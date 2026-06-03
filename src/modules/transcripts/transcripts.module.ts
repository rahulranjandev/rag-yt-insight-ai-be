import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranscriptChunk } from '@app/entities/transcript-chunks.entity';
import { TranscriptService } from './transcript.service';
import { ChunkService } from './chunk.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [TypeOrmModule.forFeature([TranscriptChunk]), EmbeddingsModule],
  providers: [TranscriptService, ChunkService],
  exports: [TranscriptService, ChunkService],
})
export class TranscriptsModule {}
