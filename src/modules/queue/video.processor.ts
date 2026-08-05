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
    job: Job<{ userId: string; youtubeUrl: string; videoId?: string }>,
  ): Promise<any> {
    if (job.name !== VIDEO_PROCESS_JOB) {
      this.logger.log(`Skipping unknown job type: ${job.name}`);
      return;
    }

    const { userId, youtubeUrl } = job.data;

    try {
      await job.updateProgress({ stage: 'fetching_metadata' });

      // 1. Fetch metadata
      const ytMetadata = await this.transcriptService.fetchMetadata(youtubeUrl);

      if (!ytMetadata) {
        throw new Error(`Metadata not found for URL: ${youtubeUrl}`);
      }

      const cleanedDescription = cleanDescription(ytMetadata.description);

      // 2. Persist the video once.
      let videoId = job.data.videoId;
      if (!videoId) {
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
        videoId = youtubeVideo.id;
        await job.updateData({ ...job.data, videoId });
      }

      // 3. Fetch transcript
      await job.updateProgress({ stage: 'fetching_transcript', videoId });
      const transcriptResponse =
        await this.transcriptService.fetchTranscript(youtubeUrl);

      if (!transcriptResponse?.transcript) {
        throw new Error(`Transcript not found for URL: ${youtubeUrl}`);
      }

      const transcriptText = Array.isArray(transcriptResponse.transcript)
        ? transcriptResponse.transcript
            .map((segment: { text: string }) => segment.text)
            .join(' ')
        : String(transcriptResponse.transcript);

      // 4. Chunk + embed
      await job.updateProgress({ stage: 'embedding_transcript', videoId });
      const chunks = await this.chunkService.chunkAndEmbedTranscript(
        videoId,
        transcriptText,
      );

      // 5. Mark completed
      await this.videosService.transcriptTaskCompleted(videoId);
      await job.updateProgress({ stage: 'completed', videoId });

      this.logger.log(
        `Completed job ${job.id} — video ${videoId}, ${chunks.chunkCount} chunks created`,
      );

      return { youtubeVideoId: videoId };
    } catch (error: any) {
      const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

      if (job.data.videoId && isFinalAttempt) {
        try {
          await this.videosService.markVideoFailed(
            job.data.videoId,
            error.message,
          );
          await job.updateProgress({
            stage: 'failed',
            videoId: job.data.videoId,
          });
        } catch (statusError: any) {
          this.logger.error(
            `Could not mark video ${job.data.videoId} as failed: ${statusError.message}`,
            statusError.stack,
          );
        }
      }

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
