# Repository Guidelines

## Project Structure & Module Organization

This is a NestJS TypeScript API for video insight, retrieval, chat, queues, and persistence. Application code lives in `src/`. Feature modules are under `src/modules/` for metadata, queue, Redis, embeddings, transcripts, retrieval, and LangGraph workflows. API domains such as `src/auth`, `src/chat`, `src/videos`, and `src/health` contain controllers, services, modules, guards, and DTOs. Database setup is in `src/db`, TypeORM entities are in `src/entities`, shared code is in `src/common`, and helpers are in `src/utils`. End-to-end tests live in `test/`; unit tests should sit beside implementation files as `*.spec.ts`.

## Build, Test, and Development Commands

- `npm run start:dev`: run the Nest app in watch mode for local development.
- `npm run build`: compile the app into `dist/`.
- `npm run start:prod`: run the compiled app from `dist/src/main.js`.
- `npm run lint`: run ESLint with autofix.
- `npm run format`: format TypeScript files with Prettier.
- `npm run test`, `npm run test:e2e`, `npm run test:cov`: run unit, e2e, or coverage tests.
- `npm run migrate`, `npm run migration:revert`, `npm run make-migrations`: manage TypeORM migrations.

## Coding Style & Naming Conventions

Use TypeScript and NestJS conventions: modules as `*.module.ts`, services as `*.service.ts`, controllers as `*.controller.ts`, DTOs under `dto/`, and entities as `*.entity.ts`. Prettier requires single quotes and trailing commas. ESLint forbids `console` usage and enforces TypeORM column, relation, and nullability rules; use the Winston logger instead. Prefer dependency injection through Nest providers and keep module-specific logic inside its feature directory.

For cancellable streaming, keep `AbortSignal` separate from domain input objects. For example, `LangGraphService.stream` accepts `stream(input: GraphUpdate, signal?: AbortSignal)`, so call it as `stream(graphUpdate, signal)` rather than adding `signal` to `GraphUpdate`.

## Testing Guidelines

Jest is configured for `*.spec.ts` files under `src/`, with e2e tests in `test/`. Add focused unit tests next to new services, controllers, guards, or processors. Run `npm run test` before opening changes and `npm run test:e2e` for endpoint or module wiring changes. For persistence or queue changes, cover success and failure paths where practical.

## Commit & Pull Request Guidelines

This branch has no existing commits, so use clear Conventional Commit-style subjects such as `feat: add video retrieval endpoint` or `fix: handle missing transcript chunks`. Pull requests should include a short description, linked issue when applicable, test results, and screenshots or sample API responses for user-visible behavior. Call out schema, migration, queue, or environment variable changes.

## Security & Configuration Tips

Keep secrets in `.env` and never commit local credentials, logs, `dist/`, or `node_modules/`. Configuration is centralized in `src/config`; update it when adding environment variables.
