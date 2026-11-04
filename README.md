# ThoughtFull session booking

Small booking product for the ThoughtFull engineering assessment. A member finds a professional, sees free 50-minute slots in the member's own timezone, and books a session. Both people receive in-app reminders.

This repository is a TypeScript monorepo. The API serves health checks, accounts, weekly availability, booking, and in-app reminders through Mongoose. The web app signs people in, then lets a member book a session and a professional publish hours.

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

Start the web app in another terminal:

```bash
cp apps/web/.env.example apps/web/.env
npm run dev:web
```

Open `http://localhost:5173`. Sign-in uses the API at `http://localhost:4000` and stores the session in an httpOnly cookie.

Signed-in requests use an httpOnly `session` cookie. The API never trusts a user id sent by the client.

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/professionals`
- `GET /api/professionals/:id`
- `GET /api/professionals/:id/slots`
- `GET /api/availability/me`
- `PUT /api/availability/me`
- `POST /api/availability/me/blocked-dates`
- `DELETE /api/availability/me/blocked-dates/:date`
- `POST /api/sessions`
- `GET /api/sessions?when=upcoming|past`
- `GET /api/sessions/schedule`
- `GET /api/sessions/:id`
- `POST /api/sessions/:id/cancel`
- `POST /api/sessions/:id/reschedule`
- `GET /api/notifications`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`

## Layout

- `apps/api` — HTTP API
- `apps/web` — browser application
- `packages/shared` — booking constants and API contract types

Do not commit `.env`.

