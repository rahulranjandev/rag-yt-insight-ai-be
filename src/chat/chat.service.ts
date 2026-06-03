import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';

import { ChatSession } from '@app/entities/chat-sessions.entity';
import { ChatMessage } from '@app/entities/chat-messages.entity';
import { ChatRequestDto } from './dto/chat-request.dto';
import { LangGraphService } from '@app/modules/langgraph/langgraph.service';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatSession)
    private readonly sessionRepository: Repository<ChatSession>,

    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,

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

  async deleteSession(sessionId: string) {
    const session = await this.getSessionById(sessionId);

    await this.sessionRepository.remove(session);

    return {
      success: true,
    };
  }

  async ask(dto: ChatRequestDto) {
    const session = await this.getSessionById(dto.sessionId);

    await this.saveMessage({
      sessionId: dto.sessionId,
      role: 'user',
      content: dto.question,
    });

    const result = await this.langGraphService.run({
      sessionId: dto.sessionId,
      question: dto.question,
      videoId: dto.videoId || session.videoId,
    });

    await this.saveMessage({
      sessionId: dto.sessionId,
      role: 'assistant',
      content: result.answer || '',
    });

    return {
      answer: result.answer || '',
    };
  }

  async streamResponse(dto: ChatRequestDto, res: Response) {
    const session = await this.getSessionById(dto.sessionId);

    await this.saveMessage({
      sessionId: dto.sessionId,
      role: 'user',
      content: dto.question,
    });

    const result = await this.langGraphService.run({
      sessionId: dto.sessionId,
      question: dto.question,
      videoId: dto.videoId || session.videoId,
    });

    const answer = result.answer ?? '';

    await this.saveMessage({
      sessionId: dto.sessionId,
      role: 'assistant',
      content: answer,
    });

    const tokens = answer.split(' ');

    for (const token of tokens) {
      res.write(
        `data: ${JSON.stringify({
          token,
        })}\n\n`,
      );
    }

    res.write(
      `data: ${JSON.stringify({
        done: true,
      })}\n\n`,
    );

    res.end();
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
