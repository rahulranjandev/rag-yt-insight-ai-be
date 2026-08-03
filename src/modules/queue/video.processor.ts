import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
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

    const { userId, youtubeUrl } = job.data;

    try {
      // 1. Fetch metadata
      const ytMetadata = await this.transcriptService.fetchMetadata(youtubeUrl);

      if (!ytMetadata) {
        throw new Error(`Metadata not found for URL: ${youtubeUrl}`);
      }

      const cleanedDescription = cleanDescription(ytMetadata.description);

      // 2. Persist video record
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

      // 3. Fetch transcript
      const transcriptResponse =
        await this.transcriptService.fetchTranscript(youtubeUrl);

      if (!transcriptResponse?.transcript) {
        throw new Error(`Transcript not found for URL: ${youtubeUrl}`);
      }

      // The API returns transcript as an array of {text, start, duration} segments
      const transcriptText = Array.isArray(transcriptResponse.transcript)
        ? transcriptResponse.transcript
            .map((segment: { text: string }) => segment.text)
            .join(' ')
        : String(transcriptResponse.transcript);

      // 4. Chunk + embed
      const chunks = await this.chunkService.chunkAndEmbedTranscript(
        youtubeVideo.id,
        transcriptText,
      );

      // 5. Mark completed
      await this.videosService.transcriptTaskCompleted(youtubeVideo.id);

      this.logger.log(
        `Completed job ${job.id} — video ${youtubeVideo.id}, ${chunks.chunkCount} chunks created`,
      );

      return { youtubeVideoId: youtubeVideo.id };
    } catch (error: any) {
      this.logger.error(
        `Job ${job.id} failed (attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? 1}): ${error.message}`,
        error.stack,
      );
      throw error; // re-throw so BullMQ can retry / mark failed
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} permanently failed after all attempts. URL: ${job.data?.youtubeUrl} — ${error.message}`,
      error.stack,
    );
  }
}
