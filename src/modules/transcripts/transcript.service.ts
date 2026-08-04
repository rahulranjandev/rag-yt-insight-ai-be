import { Injectable, Logger } from '@nestjs/common';
import { extractYoutubeId } from '@app/utils/youtube.util';
import axios from 'axios';

export interface YoutubeMetadataResponse {
  youtubeId: string;
  title: string;
  channel: string;
  duration: number;
  description: string;
  thumbnail: string;
}

export interface YoutubeTranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface YoutubeTranscriptResponse {
  youtubeId: string;
  transcript: YoutubeTranscriptSegment[];
}

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  async fetchTranscript(url: string): Promise<YoutubeTranscriptResponse> {
    const youtubeId = extractYoutubeId(url);

    const apiURL = process.env.YOUTUBE_TRANSCRIPT_API_URL;
    this.logger.log(`Youtube Transcript API URL: ${apiURL}`);
    if (!apiURL) {
      this.logger.error(
        'YOUTUBE_TRANSCRIPT_API_URL is not defined in environment variables',
      );
      throw new Error('Internal server error');
    }

    const requestURL = `${apiURL}/transcript/${youtubeId}`;

    try {
      const response = await axios.get<YoutubeTranscriptResponse>(requestURL);
      this.logger.log(`Received transcript data for YouTube ID ${youtubeId}: `);

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch transcript for YouTube ID ${youtubeId}: ${error.message}`,
      );
      throw new Error('Failed to fetch transcript');
    }
  }

  async fetchMetadata(url: string): Promise<YoutubeMetadataResponse> {
    const youtubeId = extractYoutubeId(url);

    const apiURL = process.env.YOUTUBE_TRANSCRIPT_API_URL;
    this.logger.log(`Youtube Transcript API URL: ${apiURL}`);
    if (!apiURL) {
      this.logger.error(
        'YOUTUBE_TRANSCRIPT_API_URL is not defined in environment variables',
      );
      throw new Error('Internal server error');
    }

    const requestURL = `${apiURL}/metadata/${youtubeId}`;

    try {
      const response = await axios.get<YoutubeMetadataResponse>(requestURL);
      this.logger.log(`Received metadata for YouTube ID ${youtubeId}`);

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch metadata for YouTube ID ${youtubeId}: ${error.message}`,
      );
      throw new Error('Failed to fetch metadata');
    }
  }
}
