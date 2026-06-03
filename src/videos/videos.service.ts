import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BullMqService } from '@app/modules/queue/bullmq.service';

import { Video } from '@app/entities/video.entity';
import { AnalyzeVideoDto } from './dto/analyze-video.dto';
import { BaseVideoDto } from './dto/base-video.dto';
import { User } from '@app/entities/user.entity';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);

  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    private readonly bullMqService: BullMqService,
  ) {}

  public async analyzeVideos(dto: AnalyzeVideoDto, authUser: Partial<User>) {
    if (!authUser?.id) {
      throw new BadRequestException('Invalid user information');
    }

    const job = await this.bullMqService.enqueueVideoProcessing({
      userId: authUser.id,
      youtubeUrl: dto.youtubeUrl,
    });

    this.logger.log(
      `Enqueued video processing job ${JSON.stringify(job)} for user ${authUser.id}`,
    );

    return {
      success: true,
      jobId: job.id,
      jobStatus: job.getState(),
      jobName: job.name,
    };
  }

  public async createAnalyzedVideo(baseDto?: BaseVideoDto, userId?: string) {
    if (userId) {
      throw new BadRequestException('Invalid user information');
    }

    const video = this.videoRepository.create({
      userId,
      ...baseDto,
    });

    if (!video) {
      throw new BadRequestException('Failed to create video record');
    }

    return this.videoRepository.save(video);
  }

  public async transcriptTaskCompleted(videoId: string) {
    if (!videoId) {
      throw new BadRequestException('Invalid video ID');
    }

    const video = await this.videoRepository.update(
      { id: videoId },
      { transcriptStatus: 'completed' },
    );

    if (!video.affected) {
      throw new NotFoundException('Video not found');
    }

    return {
      success: true,
      videoId,
      status: 'transcript completed',
    };
  }

  async markVideoFailed(videoId: string, reason?: string) {
    const result = await this.videoRepository.update(
      { id: videoId },
      { transcriptStatus: 'failed' },
    );

    if (!result.affected) {
      throw new NotFoundException('Video not found');
    }

    return {
      success: true,
      videoId,
      status: 'failed',
      reason: reason ?? null,
    };
  }

  async findAllVideosForUser(userId: string) {
    const videos = await this.videoRepository
      .createQueryBuilder('video')
      .where('video.userId = :userId', { userId })
      .getMany();

    return videos;
  }

  async getVideoById(id: string) {
    const video = await this.videoRepository.findOne({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return video;
  }

  async getVideo(id: string, authUserId: string) {
    if (!id && !authUserId) {
      throw new BadRequestException(`Invalid video ID or user ID`);
    }

    const video = await this.videoRepository
      .createQueryBuilder('video')
      .where('video.id = :id', { id })
      .innerJoin('video.user', 'user')
      .andWhere('user.id = :authUserId', { authUserId })
      .getOne();

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return video;
  }

  async getJobStatus(jobId: string, authUserId: string) {
    if (!jobId || !authUserId) {
      throw new BadRequestException(`Invalid job ID or user ID`);
    }

    const jobRecord = await this.bullMqService.getJob(jobId);

    if (!jobRecord) {
      throw new NotFoundException('Job not found');
    }

    if (jobRecord.data?.userId !== authUserId) {
      throw new NotFoundException('Job not found');
    }

    return jobRecord;
  }
}
