import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  public readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('redis.url');

    this.client = redisUrl
      ? new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        })
      : new Redis({
          host: this.configService.get<string>('redis.host', 'localhost'),
          port: this.configService.get<number>('redis.port', 6379),
          password: this.configService.get<string>('redis.password'),
          db: this.configService.get<number>('redis.db', 0),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        });

    this.registerConnectionLogging();
  }

  async onModuleDestroy() {
    this.logger.log('Closing Redis connection');
    await this.client.quit();
  }

  private registerConnectionLogging() {
    this.client.on('connect', () => {
      this.logger.log('Redis connection established');
    });
    this.client.on('ready', () => {
      this.logger.log('Redis client is ready');
    });
    this.client.on('reconnecting', (delay: number) => {
      this.logger.warn(`Redis reconnecting in ${delay}ms`);
    });
    this.client.on('error', (error: Error) => {
      this.logger.error(`Redis connection error: ${error.message}`);
    });
    this.client.on('end', () => {
      this.logger.warn('Redis connection closed');
    });
  }
}
