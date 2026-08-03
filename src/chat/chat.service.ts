import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';

import { ChatSession } from '@app/entities/chat-sessions.entity';
import { ChatMessage } from '@app/entities/chat-messages.entity';
import { Video } from '@app/entities/video.entity';
import { ChatRequestDto } from './dto/chat-request.dto';
import { LangGraphService } from '@app/modules/langgraph/langgraph.service';

type MessageRole = 'user' | 'assistant';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepository: Repository<ChatSession>,

    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,

    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,

    @Inject(forwardRef(() => LangGraphService))
    private readonly langGraphService: LangGraphService,
  ) {}

  private async createSession(input: {
    userId: string;
    title: string;
    videoId: string;
  }) {
    const session = this.sessionRepository.create(input);
    return this.sessionRepository.save(session);
  }

  async createNewSessionForUser(
    videoId: string,
    title: string,
    userId: string,
  ) {
    if (!videoId) {
      throw new BadRequestException('videoUid is required');
    }

    this.logger.log(
      `Creating chat session for user ${userId}, video ${videoId}, title "${title || 'N/A'}"`,
    );

    const video = await this.videoRepository.findOne({
      where: [
        { id: videoId, userId },
        { youtubeId: videoId, userId },
      ],
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return this.createSession({
      userId,
      videoId: video.id,
      title: title?.trim() || video.title,
    });
  }

  async getSessionForUser(sessionId: string, userId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  private async saveMessage(input: {
    sessionId: string;
    role: MessageRole;
    content: string;
  }) {
    try {
      const message = this.messageRepository.create(input);
      return await this.messageRepository.save(message);
    } catch (error) {
      // Don't let a persistence failure take down an in-flight stream/response.
      this.logger.error(
        `Failed to save ${input.role} message for session ${input.sessionId}`,
        (error as Error).stack,
      );
      return null;
    }
  }

  async getSessionMessages(sessionId: string) {
    return this.messageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async getSessionMessagesForUser(sessionId: string, userId: string) {
    await this.getSessionForUser(sessionId, userId);
    return this.getSessionMessages(sessionId);
  }

  async deleteSession(sessionId: string, userId: string) {
    const session = await this.getSessionForUser(sessionId, userId);
    await this.sessionRepository.remove(session);
  }

  async ask(sessionId: string, dto: ChatRequestDto, userId: string) {
    if (!dto.question?.trim()) {
      throw new BadRequestException('question is required');
    }

    const session = await this.getSessionForUser(sessionId, userId);

    await this.saveMessage({
      sessionId: session.id,
      role: 'user',
      content: dto.question,
    });

    const result = await this.langGraphService.run({
      sessionId: session.id,
      question: dto.question,
      videoId: session.videoId,
    });

    await this.saveMessage({
      sessionId: session.id,
      role: 'assistant',
      content: result.answer || '',
    });

    return { answer: result.answer || '' };
  }

  async streamResponse(
    sessionId: string,
    question: string,
    userId: string,
    res: Response,
    signal?: AbortSignal,
  ) {
    if (!question?.trim()) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: 'question is required' })}\n\n`,
      );
      res.end();
      return;
    }

    const session = await this.getSessionForUser(sessionId, userId);

    await this.saveMessage({
      sessionId: session.id,
      role: 'user',
      content: question,
    });

    let answer = '';
    let aborted = false;

    try {
      const stream = this.langGraphService.stream(
        {
          sessionId: session.id,
          question,
          videoId: session.videoId,
        },
        signal,
      );

      for await (const token of stream) {
        if (signal?.aborted) {
          aborted = true;
          break;
        }

        answer += token;
        res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
      }

      if (aborted) {
        this.logger.log(`Stream aborted by client for session ${session.id}`);
      } else {
        res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
      }
    } catch (error) {
      this.logger.error(
        `Chat response streaming failed for session ${session.id}`,
        (error as Error).stack,
      );
      if (!res.writableEnded) {
        res.write(
          `event: error\ndata: ${JSON.stringify({
            message: 'Unable to generate a chat response.',
          })}\n\n`,
        );
      }
    } finally {
      // Persist whatever was generated, even on error/abort, so the
      // conversation history matches what the user actually saw.
      if (answer.trim()) {
        await this.saveMessage({
          sessionId: session.id,
          role: 'assistant',
          content: answer,
        });
      }
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  async listUserSessions(userId: string) {
    return this.sessionRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }
}
