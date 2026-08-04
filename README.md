# RAG Video Insight API

A NestJS API that analyzes YouTube and Instagram videos, stores transcript chunks, retrieves relevant context with vector search, and answers questions about a video through regular and streamed chat endpoints.

## Prerequisites

- Node.js 20 or later
- PostgreSQL with the `vector` extension enabled
- Redis (used by BullMQ processing)
- An OpenAI-compatible chat endpoint and an embeddings endpoint

## Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file. Do not commit it. At minimum, configure:

```dotenv
PORT=3000
ALLOWED_ORIGINS=http://localhost:3001

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=rag_video_insight

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_ENABLED=true

WEB_JWT_ACCESS_TOKEN_SECRET=replace-with-a-long-random-secret
WEB_ACCESS_TOKEN_EXPIRATION_TIME=15m
WEB_JWT_REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-secret
WEB_JWT_REFRESH_TOKEN_EXPIRATION_TIME=7d

OPENAI_BASE_URL=https://your-openai-compatible-endpoint/v1
OPENAI_API_KEY=your-chat-api-key
OPENAI_MODEL=your-chat-model

OPENROUTER_EMBEDDING_BASE_URL=https://your-embedding-endpoint/v1
OPENROUTER_API_KEY=your-embedding-api-key
OPENROUTER_EMBEDDING_MODEL=your-embedding-model

YOUTUBE_TRANSCRIPT_API_URL=https://your-transcript-service
```

Run database migrations before starting the API:

```bash
npm run migrate
npm run start:dev
```

The API is available at `http://localhost:3000`. Swagger UI is available at `http://localhost:3000/api-docs`.

## Docker Compose

Docker Compose starts the API. Keep the LLM, embeddings, JWT, and transcript settings in `.env`; Compose replaces the database and Redis host settings with its local services.

```bash
# Start the API
docker compose up --build -d 

# Follow API logs
docker compose logs -f api
```

## Commands

```bash
npm run start:dev  # Run in watch mode
npm run build      # Compile to dist/
npm run start:prod # Run compiled output
npm run test       # Unit tests
npm run test:e2e   # End-to-end tests
npm run migrate    # Apply TypeORM migrations
```

## API overview

All routes except registration, login, and health checks require a bearer token. The global route prefix is `/api/v1`.

- `POST /api/v1/auth/register` — create an account.
- `POST /api/v1/auth/login` — obtain access and refresh tokens.
- `POST /api/v1/videos/analyze` — queue a YouTube or Instagram video for analysis.
- `GET /api/v1/videos/status/:jobId` — check an analysis job.
- `POST /api/v1/chat/sessions/:videoUid` — create a chat session for an analyzed video.
- `POST /api/v1/chat/stream/:sessionId` — stream a grounded answer as Server-Sent Events.

For streamed chat responses, keep the connection open and consume SSE events as they arrive:

```bash
curl -N -X POST "http://localhost:3000/api/v1/chat/stream/<session-id>" \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  --data '{"question":"What are the main points?"}'
```

The stream emits `token`, `done`, and `error` events. Time to first token includes chat-history loading, vector retrieval, and the configured LLM provider's response time.

## Testing

Unit tests run without external infrastructure:

```bash
npm run test
```

End-to-end tests require reachable PostgreSQL and Redis instances matching the active test environment. Use isolated test credentials or override infrastructure providers in the test module; do not point tests at production services.

## Security

Keep `.env`, API keys, JWT secrets, and database credentials out of version control. Set `ALLOWED_ORIGINS` to trusted frontend origins in deployed environments and use separate credentials for development, testing, and production.
