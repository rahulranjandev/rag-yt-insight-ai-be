import { IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeVideoDto {
  @ApiProperty({
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'Public YouTube video URL to analyze.',
  })
  @IsUrl()
  youtubeUrl: string;
}
