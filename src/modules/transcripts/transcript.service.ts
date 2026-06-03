import { Injectable, Logger } from '@nestjs/common';
import { extractYoutubeId } from '@app/utils/youtube.util';
import axios from 'axios';

@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);

  async fetchTranscript(url: string) {
    const videoId = extractYoutubeId(url);
    this.logger.debug(`Extracted video ID: ${videoId} from URL: ${url}`);

    const apiURL = process.env.YOUTUBE_TRANSCRIPT_API_URL;
    if (!apiURL) {
      this.logger.error(
        'YOUTUBE_TRANSCRIPT_API_URL is not defined in environment variables',
      );
      throw new Error('Internal server error');
    }

    const requestURL = `${apiURL}/transcript/${videoId}`;

    try {
      const response = await axios.get(requestURL);
      this.logger.debug(
        `Received transcript data for video ID ${videoId}: ${JSON.stringify(response.data)}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch transcript for video ID ${videoId}: ${error.message}`,
      );
      throw new Error('Failed to fetch transcript');
    }
  }

  async fetchMetadata(url: string) {
    const videoId = extractYoutubeId(url);
    this.logger.debug(`Extracted video ID: ${videoId} from URL: ${url}`);

    const apiURL = process.env.YOUTUBE_TRANSCRIPT_API_URL;
    if (!apiURL) {
      this.logger.error(
        'YOUTUBE_TRANSCRIPT_API_URL is not defined in environment variables',
      );
      throw new Error('Internal server error');
    }

    const requestURL = `${apiURL}/metadata/${videoId}`;

    try {
      const response = await axios.get(requestURL);
      this.logger.debug(
        `Received metadata for video ID ${videoId}: ${JSON.stringify(response.data)}`,
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch metadata for video ID ${videoId}: ${error.message}`,
      );
      throw new Error('Failed to fetch metadata');
    }
  }
}
