# ThoughtFull session booking

Small booking product for the ThoughtFull engineering assessment. A member finds a professional, sees free 50-minute slots in the member's own timezone, and books a session. Both people receive in-app reminders.

This repository is a TypeScript monorepo. The API serves health checks, registration, login, and logout through Mongoose. Booking and the web application are not built yet.

## Stack

- React, Vite, TypeScript, React Router, Tailwind CSS, TanStack Query, React Hook Form, and Zod
- Node.js, Express, MongoDB, Mongoose, and Zod
- Vitest, Supertest, Playwright, ESLint, and Prettier

## Prerequisites

- Node.js 20 or newer
- npm 11
- Docker, if you want MongoDB and the API started together

## Scripts

```bash
npm install
npm run typecheck
npm run lint
npm run format:check
npm test
```

## Run locally

Start MongoDB and the API:

```bash
docker compose up --build
```

The API listens on `http://localhost:4000`. MongoDB is published on `localhost:27017`, so the database data survives in the `mongo-data` volume.

To run the API on the host instead, start only the database and use the example environment file:

```bash
docker compose up mongo
cp .env.example .env
npm install
npm run dev:api
```

`GET http://localhost:4000/api/health` returns `200` when Mongoose is connected and `503` when it is not.

Signed-in requests use an httpOnly `session` cookie. The API never trusts a user id sent by the client.

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Layout

- `apps/api` — HTTP API
- `apps/web` — browser application
- `packages/shared` — booking constants and API contract types

Do not commit `.env`.

