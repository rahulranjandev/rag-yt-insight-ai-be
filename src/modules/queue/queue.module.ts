import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAME } from './queue.constants';
import { VideoProcessor } from './video.processor';
import { BullMqService } from './bullmq.service';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { VideosModule } from '@app/videos/videos.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
        maxRetriesPerRequest: null,
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_NAME,
    }),
    TranscriptsModule,
    forwardRef(() => VideosModule),
    EmbeddingsModule,
  ],
  providers: [VideoProcessor, BullMqService],
  exports: [BullMqService],
})
export class QueueModule {}
