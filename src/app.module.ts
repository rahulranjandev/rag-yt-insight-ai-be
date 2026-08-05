import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';

import { DbModule } from './db/db.module';
import { LoggingMiddleware } from './logger/logging.middleware';
import config from './config';

import { HealthModule } from './health/health.module';
import { WebJwtAuthGuard } from './auth/guards/web-jwt-auth.guard';
import { AuthModule } from '@app/auth/auth.module';
import { VideosModule } from '@app/videos/videos.module';
import { ChatModule } from './chat/chat.module';
import { RetrievalModule } from './modules/retrieval/retrieval.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      load: config,
    }),
    TypeOrmModule.forFeature([]),
    DbModule,
    HealthModule,
    AuthModule,
    VideosModule,
    ChatModule,
    RetrievalModule,
    RedisModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: WebJwtAuthGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
