import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { CreateChatSessionDto } from './dto/create-chat-session.dto';
import { WebJwtAuthGuard } from '@app/auth/guards/web-jwt-auth.guard';
import { AuthUser } from '@app/common/decorators/user.decorator';
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
  private readonly logger = new Logger(ChatController.name);
  constructor(private readonly chatService: ChatService) {}

  @Post('new/sessions/:videoUid')
  @ApiOperation({ summary: 'Create a chat session for an analyzed video' })
  createSession(
    @Param('videoUid') videoUid: string,
    @Body() { title }: CreateChatSessionDto,
    @AuthUser() userId: string,
  ) {
    this.logger.log(
      `Creating chat session for user ${userId} and video ${videoUid} with title ${title || 'N/A'}`,
    );
    return this.chatService.createNewSessionForUser(
      videoUid,
      title || `Chat Session for Video ${videoUid}`,
      userId,
    );
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List chat sessions for the authenticated user' })
  listSessions(@AuthUser() userId: string) {
    return this.chatService.listUserSessions(userId);
  }

  @Post('stream/:sessionId')
  @ApiOperation({ summary: 'Stream an AI answer for a chat session' })
  @ApiBody({ type: ChatRequestDto })
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description:
      'Streams Server-Sent Events. Token, done, and error events contain JSON data.',
    schema: {
      example:
        'event: token\ndata: {"token":"The"}\n\nevent: done\ndata: {"done":true}\n\n',
    },
  })
  async stream(
    @Param('sessionId') sessionId: string,
    @Body() dto: ChatRequestDto,
    @AuthUser() userId: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    await this.chatService.streamResponse(sessionId, dto.question, userId, res);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'List messages for a chat session' })
  @ApiParam({
    name: 'sessionId',
    description: 'Chat session ID.',
    example: 'b7d986b5-2b14-4c5d-a1b5-7fd764df8b17',
  })
  getSessionMessages(
    @Param('sessionId') sessionId: string,
    @AuthUser() userId: string,
  ) {
    return this.chatService.getSessionMessagesForUser(sessionId, userId);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Delete a chat session' })
  @ApiParam({
    name: 'sessionId',
    description: 'Chat session ID.',
    example: 'b7d986b5-2b14-4c5d-a1b5-7fd764df8b17',
  })
  deleteSession(
    @Param('sessionId') sessionId: string,
    @AuthUser() userId: string,
  ) {
    return this.chatService.deleteSession(sessionId, userId);
  }
}
