# Task API

A small Node.js backend written in strict TypeScript with native ECMAScript
modules. Task operations return Promises and HTTP handlers await their results.
It uses Node's HTTP server and test runner; no framework or database is required.

## Setup

Use Node.js 24 LTS (see `.nvmrc`) and npm.

```sh
nvm use
npm ci
npm run check
npm run build
npm start
```

The server listens at `http://127.0.0.1:3001`. Set `PORT` and `HOST` to override
these defaults. For development, run `npm run dev` (TypeScript watch mode).
`npm run typecheck` checks types without emitting; `npm test` compiles and runs
unit and real HTTP integration tests once. `npm run check` runs both.

## Model

`User`: `id`, `name`, `email`. One demo user is provided: `demo-user`.
`Task`: `id`, `title`, `completed`, `userId`, `createdAt`.
Interfaces live in `src/models.ts`. Runtime validation checks incoming JSON;
TypeScript types alone do not validate HTTP requests.

## Endpoints

| Method | Path         | Result                  |
| ------ | ------------ | ----------------------- |
| GET    | `/health`    | 200 health status       |
| GET    | `/users`     | 200 demo user list      |
| GET    | `/tasks`     | 200 task list           |
| POST   | `/tasks`     | 201 created task        |
| GET    | `/tasks/:id` | 200 task or 404         |
| PATCH  | `/tasks/:id` | 200 updated task or 404 |
| DELETE | `/tasks/:id` | 204, no body, or 404    |

Create a task:

```sh
curl -i http://127.0.0.1:3001/tasks \
  -H 'Content-Type: application/json' \
  -d '{"title":"Learn async-await","userId":"demo-user"}'
```

Copy the returned ID into the following URLs:

```sh
curl http://127.0.0.1:3001/tasks
curl -X PATCH http://127.0.0.1:3001/tasks/TASK_ID \
  -H 'Content-Type: application/json' -d '{"completed":true}'
curl -i -X DELETE http://127.0.0.1:3001/tasks/TASK_ID
```

Titles are trimmed and must contain 1–200 characters. Creation accepts `title`
and the demo `userId`; new tasks start incomplete. Updates accept `title` and/or
boolean `completed`. Invalid input returns 400, unknown tasks/routes return 404,
unsupported task methods return 405, oversized bodies return 413, and incorrect
media types return 415. Unexpected failures return a generic 500 JSON error and
are logged server-side. Error bodies have the form `{"error":"message"}`.

## Structure and limitations

- `src/tasks.ts`: async operations, validation, isolated in-memory store.
- `src/app.ts`: HTTP routing, body parsing, response and failure handling.
- `src/server.ts`: environment configuration and server lifecycle.
- `test/`: service tests and HTTP tests using ephemeral local ports.

This is a learning/demo backend. Data disappears when the process restarts.
There is no authentication, authorization, durable database, pagination, rate
limiting, or user registration. Async methods demonstrate Promise-based service
contracts; an in-memory Map does not become asynchronous disk/network storage.
Do not expose the demo as a production service or put real personal data in it.
Publishing the source on GitHub does not deploy a running backend.

## AI use

This project was generated with OpenAI Codex from the user's requirements.
AI assisted with the architecture, TypeScript/ESM setup, interfaces, async task
service, HTTP handlers, tests, and documentation. Verification commands and
results are recorded in `VERIFICATION.md`. AI generation and passing tests do
not guarantee correctness; the limitations above still apply.
