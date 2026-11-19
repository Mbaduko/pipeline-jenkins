# pipeline-jenkins

A minimal Node.js + TypeScript + Express service.

## Endpoints

| Method | Path      | Description          |
| ------ | --------- | -------------------- |
| GET    | `/`       | Greeting message     |
| GET    | `/health` | Liveness/health info |

## Getting started

Requires Node.js 20+ (see `.nvmrc`).

```bash
npm ci
cp .env.example .env
npm run dev          # start with hot reload on http://localhost:3000
```

## Scripts

| Script                  | Description                    |
| ----------------------- | ------------------------------ |
| `npm run dev`           | Run in watch mode with `tsx`   |
| `npm run build`         | Compile TypeScript to `dist/`  |
| `npm start`             | Run the compiled app           |
| `npm test`              | Run tests                      |
| `npm run test:coverage` | Run tests with coverage        |
| `npm run lint`          | Lint with ESLint               |
| `npm run format:check`  | Check formatting with Prettier |
| `npm run typecheck`     | Type-check sources and tests   |
