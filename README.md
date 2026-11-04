# ThoughtFull session booking

Small booking product for the ThoughtFull engineering assessment. A member finds a professional, sees free 50-minute slots in the member's own timezone, and books a session. Both people receive in-app reminders.

This repository is a TypeScript monorepo. This first step sets up the workspaces, shared booking rules, and the requirements. The API and the web application are not runnable yet.

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

## Layout

- `apps/api` — HTTP API
- `apps/web` — browser application
- `packages/shared` — booking constants and API contract types

Copy `.env.example` to `.env` when the API is added. Do not commit `.env`.

