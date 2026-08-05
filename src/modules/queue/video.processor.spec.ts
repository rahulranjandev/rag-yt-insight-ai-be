import { VideoProcessor } from './video.processor';
import { VIDEO_PROCESS_JOB } from './queue.constants';

describe('VideoProcessor', () => {
  const createProcessor = () => {
    const videosService = {
      createAnalyzedVideo: jest.fn(),
      transcriptTaskCompleted: jest.fn(),
      markVideoFailed: jest.fn(),
    };
    const transcriptService = {
      fetchMetadata: jest.fn(),
      fetchTranscript: jest.fn(),
    };
    const chunkService = {
      chunkAndEmbedTranscript: jest.fn(),
    };

    return {
      processor: new VideoProcessor(
        videosService as any,
        transcriptService as any,
        chunkService as any,
      ),
      videosService,
      transcriptService,
      chunkService,
    };
  };

  const metadata = {
    youtubeId: 'youtube-id',
    title: 'A video',
    description: 'A description',
    duration: 120,
    channel: 'A channel',
    thumbnail: 'https://example.com/image.jpg',
  };

  it('preserves the video ID across retries and marks the video failed only on the final attempt', async () => {
    const { processor, videosService, transcriptService } = createProcessor();
    transcriptService.fetchMetadata.mockResolvedValue(metadata);
    transcriptService.fetchTranscript.mockRejectedValue(
      new Error('Transcript API unavailable'),
    );
    videosService.createAnalyzedVideo.mockResolvedValue({ id: 'video-1' });

    const job: any = {
      id: 'job-1',
      name: VIDEO_PROCESS_JOB,
      data: { userId: 'user-1', youtubeUrl: 'https://youtube.test/video' },
      attemptsMade: 0,
      opts: { attempts: 3 },
      updateData: jest.fn(async (data) => {
        job.data = data;
      }),
      updateProgress: jest.fn(),
    };

    await expect(processor.process(job)).rejects.toThrow(
      'Transcript API unavailable',
    );
    expect(job.data.videoId).toBe('video-1');
    expect(videosService.markVideoFailed).not.toHaveBeenCalled();

    job.attemptsMade = 2;
    await expect(processor.process(job)).rejects.toThrow(
      'Transcript API unavailable',
    );

    expect(videosService.createAnalyzedVideo).toHaveBeenCalledTimes(1);
    expect(videosService.markVideoFailed).toHaveBeenCalledWith(
      'video-1',
      'Transcript API unavailable',
    );
    expect(job.updateProgress).toHaveBeenCalledWith({
      stage: 'failed',
      videoId: 'video-1',
    });
  });
});
