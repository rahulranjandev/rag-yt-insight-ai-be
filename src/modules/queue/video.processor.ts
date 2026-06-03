import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { VideosService } from '@app/videos/videos.service';
import { TranscriptService } from '../transcripts/transcript.service';
import { ChunkService } from '../transcripts/chunk.service';
import { QUEUE_NAME, VIDEO_PROCESS_JOB } from './queue.constants';
import { cleanDescription } from '@app/utils/youtube.util';

@Processor(QUEUE_NAME)
export class VideoProcessor extends WorkerHost {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(
    private readonly videosService: VideosService,
    private readonly transcriptService: TranscriptService,
    private readonly chunkService: ChunkService,
  ) {
    super();
  }

  async process(
    job: Job<{ userId: string; youtubeUrl: string }>,
  ): Promise<any> {
    if (job.name !== VIDEO_PROCESS_JOB) {
      this.logger.log(`Skipping unknown job type: ${job.name}`);
      return;
    }

    this.logger.log(`Processing video job ${job.id}`);

    const { userId, youtubeUrl } = job.data;

    const ytMetadata = await this.transcriptService.fetchMetadata(youtubeUrl);

    this.logger.debug(
      `Fetched metadata for ${youtubeUrl}: ${JSON.stringify(ytMetadata)}`,
    );

    const cleanedDescription = cleanDescription(ytMetadata.description);
    this.logger.debug(`Cleaned description: ${cleanedDescription}`);

    if (!ytMetadata) {
      this.logger.error(`Failed to fetch metadata for ${youtubeUrl}`);
      throw new Error('Video metadata not found');
    }

    const youtubeVideo = await this.videosService.createAnalyzedVideo(
      {
        youtubeId: ytMetadata.youtubeId,
        title: ytMetadata.title,
        description: cleanedDescription,
        duration: ytMetadata.duration,
        channel: ytMetadata.channel,
        thumbnail: ytMetadata.thumbnail,
        transcriptStatus: 'processing',
      },
      userId,
    );

    this.logger.log(
      `Created video record with ID ${youtubeVideo.id} for YouTube video ${ytMetadata.youtubeId}`,
    );

    const youtubeTranscript =
      await this.transcriptService.fetchTranscript(youtubeUrl);

    if (!youtubeTranscript) {
      this.logger.error(`Failed to fetch transcript for ${youtubeUrl}`);
      throw new Error('Transcript not found');
    }

    // Create transcript chunks
    this.logger.log(
      `Creating transcript chunks for video ${youtubeVideo.id} - transcript length: ${youtubeTranscript.transcript.length} characters`,
    );
    const chunks = await this.chunkService.chunkAndEmbedTranscript(
      youtubeVideo.id,
      youtubeTranscript.transcript,
    );

    this.logger.log(
      `Completed processing video job ${job.id} - created video record and ${chunks.chunkCount} transcript chunks for video ${youtubeVideo.id}`,
    );

    // Mark video as completed
    await this.videosService.transcriptTaskCompleted(youtubeVideo.id);

    return {
      youtubeVideoId: youtubeVideo.id,
    };
  }
}
