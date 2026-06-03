import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatRequestDto {
  @ApiProperty({
    example: 'b7d986b5-2b14-4c5d-a1b5-7fd764df8b17',
    description: 'Existing chat session ID.',
  })
  @IsUUID()
  sessionId: string;

  @ApiProperty({
    example: 'What is the main theme of the video?',
    description: 'Question to answer using analyzed video context.',
  })
  @IsString()
  question: string;

  @IsOptional()
  @IsUUID()
  videoId?: string;
}
