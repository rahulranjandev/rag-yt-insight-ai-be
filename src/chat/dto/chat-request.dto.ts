import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({
    example: 'What is the main theme of the video?',
    description: 'Question to answer using analyzed video context.',
  })
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  videoId?: string;
}
