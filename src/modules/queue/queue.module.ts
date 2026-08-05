import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAME } from './queue.constants';
import { VideoProcessor } from './video.processor';
import { BullMqService } from './bullmq.service';
import { TranscriptsModule } from '../transcripts/transcripts.module';
import { VideosModule } from '@app/videos/videos.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          // Prefer the complete URL so credentials, TLS, and database number
          // are not lost for hosted Redis instances.
          ...(configService.get<string>('redis.url')
            ? { url: configService.getOrThrow<string>('redis.url') }
            : {
                host: configService.get<string>('redis.host', 'localhost'),
                port: configService.get<number>('redis.port', 6379),
                password: configService.get<string>('redis.password'),
                db: configService.get<number>('redis.db', 0),
              }),
          maxRetriesPerRequest: null,
        },
      }),
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
