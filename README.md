# ThoughtFull session booking

Small booking product for the ThoughtFull engineering assessment. A member finds a professional, sees free 50-minute slots in the member's own timezone, and books a session. Both people receive in-app reminders.

This repository is a TypeScript monorepo. The API serves a health check and connects to MongoDB through Mongoose. Sign-in, booking, and the web application are not built yet.

## Stack

- React, Vite, TypeScript, React Router, Tailwind CSS, TanStack Query, React Hook Form, and Zod
- Node.js, Express, MongoDB, Mongoose, and Zod
- Vitest, Supertest, Playwright, ESLint, and Prettier

## Prerequisites

- Node.js 20 or newer
- npm 11

## Scripts

```bash
npm install
npm run typecheck
npm run lint
npm run format:check
npm test
```

## Run the API

MongoDB must be running locally. Copy the example environment file, then start the API:

```bash
cp .env.example .env
npm run dev:api
```

`GET http://localhost:4000/api/health` returns `200` when Mongoose is connected and `503` when it is not.

## Layout

- `apps/api` — HTTP API
- `apps/web` — browser application
- `packages/shared` — booking constants and API contract types

Do not commit `.env`.

