import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { WebJwtAuthGuard } from '@app/auth/guards/web-jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(WebJwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  @ApiOperation({ summary: 'Stream an AI answer for a chat session' })
  @ApiBody({ type: ChatRequestDto })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description:
      'Streams Server-Sent Events. Each event contains a content chunk or done flag.',
    schema: {
      example:
        'data: {"content":"The videos both..."}\n\ndata: {"done":true}\n\n',
    },
  })
  async stream(@Body() dto: ChatRequestDto, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    await this.chatService.streamResponse(dto, res);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'List messages for a chat session' })
  @ApiParam({
    name: 'sessionId',
    description: 'Chat session ID.',
    example: 'b7d986b5-2b14-4c5d-a1b5-7fd764df8b17',
  })
  getSessionMessages(@Param('sessionId') sessionId: string) {
    return this.chatService.getSessionMessages(sessionId);
  }
}
