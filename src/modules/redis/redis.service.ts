import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  public readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT || 6379),
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
