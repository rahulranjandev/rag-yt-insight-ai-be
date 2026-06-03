import { ValidationPipe, HttpStatus, RequestMethod } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { Response, NextFunction } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import compression from 'compression';
import { randomBytes, randomUUID as uuid } from 'node:crypto';
import { WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { instance } from './logger/winston.logger';
import { ErrorHandler } from './logger/ErrorHandler';

if (!process.env.PORT) {
  throw new Error('PORT is not set');
}

const PORT = process.env.PORT;

const NodeID = randomBytes(16).toString('hex');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: WinstonModule.createLogger({
      instance: instance,
    }),
    rawBody: true,
  });

  app.use(
    compression({
      threshold: 0,
    }),
  );

  app.set('trust proxy', 1);

  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: '/', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
    exposedHeaders: ['Authorization'],
  });

  app.useStaticAssets(join(process.cwd(), 'static'), {
    prefix: '/static/',
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.set('Cache-Control', 'public, max-age=31536000');
    },
  });

  const config = new DocumentBuilder()
    .setTitle('RAG Video Insight API')
    .setDescription(
      'API for authenticating users, analyzing YouTube and Instagram videos, retrieving transcripts, and chatting over video insights.',
    )
    .setVersion('1.0')
    .addTag('auth', 'Authentication and profile endpoints')
    .addTag('videos', 'Video analysis and retrieval endpoints')
    .addTag('chat', 'Chat and streaming answer endpoints')
    .addTag('health', 'Public service health endpoints')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Paste a JWT access token returned by login or register.',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  app.use((req: ContextualRequest, res: Response, next: NextFunction) => {
    req.requestId = uuid();
    req.nodeId = NodeID;
    res.setHeader('X-Node', req.nodeId);
    res.setHeader('X-Request-Id', req.requestId);
    instance.defaultMeta = { requestId: req.requestId };
    next();
  });

  app.useGlobalFilters(new ErrorHandler());

  await app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      `Listening on http://localhost:${PORT} \nAPI DOCS on http://localhost:${PORT}/api-docs \nSwagger JSON http://localhost:${PORT}/api-docs-json`,
    );
  });
}
bootstrap();
