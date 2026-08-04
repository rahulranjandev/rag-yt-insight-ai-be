import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Response } from 'express';

jest.mock('@app/modules/langgraph/langgraph.service', () => ({
  LangGraphService: class LangGraphService {},
}));

import { ChatService } from './chat.service';

describe('ChatService', () => {
  const session = {
    id: 'b7d986b5-2b14-4c5d-a1b5-7fd764df8b17',
    userId: 'user-1',
    videoId: 'd2b21130-1213-4d64-a9fe-f6e28f3a4929',
  };

  const createService = () => {
    const sessionRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      find: jest.fn(),
    };
    const messageRepository = {
      find: jest.fn(),
      create: jest.fn((input) => input),
      save: jest.fn(),
    };
    const langGraphService = {
      run: jest.fn(),
      stream: jest.fn(),
    };
    const videoRepository = {
      findOne: jest.fn(),
    };

    return {
      service: new ChatService(
        sessionRepository as any,
        messageRepository as any,
        videoRepository as any,
        langGraphService as any,
      ),
      sessionRepository,
      messageRepository,
      videoRepository,
      langGraphService,
    };
  };

  it('scopes session lookup to the authenticated user', async () => {
    const { service, sessionRepository } = createService();
    sessionRepository.findOne.mockResolvedValue(null);

    await expect(
      service.getSessionForUser(session.id, 'another-user'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(sessionRepository.findOne).toHaveBeenCalledWith({
      where: { id: session.id, userId: 'another-user' },
    });
  });

  it('creates a session only for a video owned by the authenticated user', async () => {
    const { service, sessionRepository, videoRepository } = createService();
    videoRepository.findOne.mockResolvedValue({
      id: session.videoId,
      title: 'Video title',
    });
    sessionRepository.create.mockImplementation((input) => input);
    sessionRepository.save.mockImplementation(async (input) => input);

    await expect(
      service.createNewSessionForUser(session.videoId, '  ', session.userId),
    ).resolves.toMatchObject({
      userId: session.userId,
      videoId: session.videoId,
      title: 'Video title',
    });

    expect(videoRepository.findOne).toHaveBeenCalledWith({
      where: [
        { id: session.videoId, userId: session.userId },
        { youtubeId: session.videoId, userId: session.userId },
      ],
    });
  });

  it('throws BadRequestException if videoId is missing', async () => {
    const { service } = createService();
    await expect(
      service.createNewSessionForUser('', 'Video title', session.userId),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('streams model chunks as SSE and saves the completed answer', async () => {
    const { service, sessionRepository, messageRepository, langGraphService } =
      createService();
    sessionRepository.findOne.mockResolvedValue(session);
    messageRepository.save.mockImplementation(async (message) => message);
    langGraphService.stream.mockReturnValue(
      (async function* () {
        yield 'Hello';
        yield ' world';
      })(),
    );
    const write = jest.fn();
    const end = jest.fn();
    const response = {
      write,
      end,
    } as unknown as Response;
    const abortController = new AbortController();

    await service.streamResponse(
      session.id,
      'Hi',
      session.userId,
      response,
      abortController.signal,
    );

    expect(write).toHaveBeenNthCalledWith(
      1,
      'event: token\ndata: {"token":"Hello"}\n\n',
    );
    expect(write).toHaveBeenNthCalledWith(
      2,
      'event: token\ndata: {"token":" world"}\n\n',
    );
    expect(write).toHaveBeenLastCalledWith(
      'event: done\ndata: {"done":true}\n\n',
    );
    expect(messageRepository.save).toHaveBeenLastCalledWith({
      sessionId: session.id,
      role: 'assistant',
      content: 'Hello world',
    });
    expect(langGraphService.stream).toHaveBeenCalledWith(
      {
        sessionId: session.id,
        question: 'Hi',
        videoId: session.videoId,
      },
      abortController.signal,
    );
    expect(end).toHaveBeenCalledTimes(1);
  });

  it('returns an SSE error without querying a session for an empty question', async () => {
    const { service, sessionRepository, langGraphService } = createService();
    const write = jest.fn();
    const end = jest.fn();

    await service.streamResponse(session.id, '   ', session.userId, {
      write,
      end,
    } as unknown as Response);

    expect(write).toHaveBeenCalledWith(
      'event: error\ndata: {"message":"question is required"}\n\n',
    );
    expect(end).toHaveBeenCalledTimes(1);
    expect(sessionRepository.findOne).not.toHaveBeenCalled();
    expect(langGraphService.stream).not.toHaveBeenCalled();
  });
});
