import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

jest.mock('@langchain/langgraph', () => {
  const Annotation = Object.assign(() => ({}), {
    Root: (spec: unknown) => ({ spec }),
  });

  class StateGraph {
    addNode() {
      return this;
    }

    addEdge() {
      return this;
    }

    compile() {
      return {
        invoke: async (input: unknown) => input,
        stream: async function* stream() {
          yield {};
        },
      };
    }
  }

  return {
    Annotation,
    StateGraph,
    START: '__start__',
    END: '__end__',
  };
});

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({ content: 'mock answer' }),
  })),
  OpenAIEmbeddings: jest.fn().mockImplementation(() => ({
    embedQuery: jest.fn().mockResolvedValue(new Array(1536).fill(0)),
    embedDocuments: jest.fn().mockResolvedValue([new Array(1536).fill(0)]),
  })),
}));

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ status: 'ok' });
  });
});
