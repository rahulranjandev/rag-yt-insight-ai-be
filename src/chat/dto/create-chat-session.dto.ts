import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChatSessionDto {
  @ApiPropertyOptional({
    example: 'Questions about the product launch',
    description: 'Optional label for this chat session.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;
}
