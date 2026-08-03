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

  async createSession(input: {
    userId: string;
    title: string;
    videoId: string;
  }) {
    const session = this.sessionRepository.create({
      userId: input.userId,
      title: input.title,
      videoId: input.videoId,
    });

    return this.sessionRepository.save(session);
  }

  async createNewSessionForUser(
    videoId: string,
    title: string,
    userId: string,
  ) {
    this.logger.log(
      `Creating chat session for user ${userId} and video ${videoId} "${JSON.stringify({ videoUid: videoId, title })}"`,
    );
    if (!videoId) {
      throw new BadRequestException('videoUid is required');
    }
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

  async createSessionForUser(
    input: { videoId?: string; title?: string },
    userId: string,
  ) {
    return this.createNewSessionForUser(
      input.videoId || '',
      input.title || '',
      userId,
    );
  }

  async getSessionById(sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: {
        id: sessionId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async getSessionForUser(sessionId: string, userId: string) {
    const session = await this.sessionRepository.findOne({
      where: {
        id: sessionId,
        userId,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async saveMessage(input: {
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
  }) {
    const message = this.messageRepository.create({
      sessionId: input.sessionId,
      role: input.role,
      content: input.content,
    });

    return this.messageRepository.save(message);
  }

  async getSessionMessages(sessionId: string) {
    return this.messageRepository.find({
      where: {
        sessionId,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async getSessionMessagesForUser(sessionId: string, userId: string) {
    await this.getSessionForUser(sessionId, userId);
    return this.getSessionMessages(sessionId);
  }

  async deleteSession(sessionId: string, userId: string) {
    const session = await this.getSessionForUser(sessionId, userId);

    await this.sessionRepository.remove(session);

    return {
      success: true,
    };
  }

  async ask(sessionId: string, dto: ChatRequestDto, userId: string) {
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

    return {
      answer: result.answer || '',
    };
  }

  async streamResponse(
    sessionId: string,
    question: string,
    userId: string,
    res: Response,
  ) {
    const session = await this.getSessionForUser(sessionId, userId);

    await this.saveMessage({
      sessionId: session.id,
      role: 'user',
      content: question,
    });

    let answer = '';

    try {
      const stream = this.langGraphService.stream({
        sessionId: session.id,
        question,
        videoId: session.videoId,
      });

      for await (const token of stream) {
        answer += token;
        res.write(`event: \ndata: ${JSON.stringify({ token })}\n\n`);
      }

      await this.saveMessage({
        sessionId: session.id,
        role: 'assistant',
        content: answer,
      });

      res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
    } catch (error) {
      this.logger.error('Chat response streaming failed', error);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: 'Unable to generate a chat response.',
        })}\n\n`,
      );
    } finally {
      res.end();
    }
  }

  async listUserSessions(userId: string) {
    return this.sessionRepository.find({
      where: {
        userId,
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }
}
