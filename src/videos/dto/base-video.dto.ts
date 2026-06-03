import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BaseVideoDto {
  @ApiProperty({ description: 'The YouTube ID of the video' })
  @IsString()
  youtubeId: string;

  @ApiProperty({ description: 'The title of the video' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'The description of the video' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'The channel name of the video' })
  @IsString()
  channel: string;

  @ApiProperty({
    description: 'The duration of the video in seconds',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsNumber()
  duration?: number | null;

  @ApiProperty({ description: 'The thumbnail URL of the video' })
  @IsString()
  thumbnail: string;

  @ApiProperty({
    description: 'The status of the video transcript',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  transcriptStatus?: string | null;
}
