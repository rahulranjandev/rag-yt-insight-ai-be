import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAME, VIDEO_PROCESS_JOB } from './queue.constants';

@Injectable()
export class BullMqService {
  constructor(
    @InjectQueue(QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  async enqueueVideoProcessing(payload: {
    userId: string;
    youtubeUrl: string;
  }) {
    const job = await this.queue.add(VIDEO_PROCESS_JOB, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    });

    return job;
  }

  async getJob(jobId: string) {
    return this.queue.getJob(jobId);
  }

  async getJobStatus(jobId: string) {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return {
      jobId: job.id,
      name: job.name,
      state: await job.getState(),
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason ?? null,
      processedOn: job.processedOn ?? null,
      finishedOn: job.finishedOn ?? null,
    };
  }

  async retryJob(jobId: string) {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    await job.retry();
    return { jobId: job.id, retried: true };
  }

  async removeJob(jobId: string) {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      return null;
    }

    await job.remove();
    return { jobId: job.id, removed: true };
  }
}
