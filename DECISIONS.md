# Decisions

These are the choices that are not fixed by the assessment.

## Persistence

Mongoose is the only database API. Each collection has a model that owns its schema, indexes, and queries. There is no repository layer and no call to the native MongoDB driver.

Booking does not use a multi-document transaction. A local MongoDB does not have to be a replica set. Overlapping bookings are stopped with partial unique indexes on a booked professional start and a booked member start, plus a short-lived lock document taken in a stable order for the member and the professional. A duplicate key becomes a conflict. Reschedule updates the same session document, so a failed change leaves the original time in place.

## Time

Session instants are stored in UTC. Weekly hours are wall-clock `HH:mm` values in the professional's timezone. Luxon builds the slots. A start that falls in a daylight-saving gap is skipped. The 24-hour cancellation rule is 24 elapsed hours, not a calendar day. The member sees those UTC instants in the timezone saved on their account.

A slot is 50 real minutes, laid from the start of a working interval, and offered only when it also ends inside that interval. The window is the viewer's local today through 28 days. A start sooner than 2 hours is not offered. A professional can block a whole local date.

## Accounts

The role is chosen at sign-up and does not change. The session is an opaque token in an httpOnly `session` cookie. The database stores the SHA-256 hash. The cookie lasts 7 days, is `SameSite=Lax`, and is marked `Secure` only in production. The API ignores any user id sent by the client. Email is visible to the account holder and is not part of a professional profile.

## Reminders

Booking plans a 24-hour reminder and a 1-hour reminder for each person when that fire time is still in the future. The plan is stored on the session. Delivery is an in-process poller every 15 seconds. It claims a reminder, writes one notification with a unique reminder id, and marks the reminder delivered. A second claim or a process restart does not create a second notification. Cancel drops pending reminders. Reschedule replaces them. A reminder that was already delivered stays delivered. A reminder that is still pending when its session starts, for example because the API was down at its fire time, is cancelled instead of being sent late.

## Web

The browser calls the API with `credentials: 'include'`. JavaScript never reads the session token. TanStack Query caches the signed-in account. A 401 from `/api/auth/me` is signed out. Any other failure stays on a retry screen. Members browse and book. Professionals edit hours and see their upcoming schedule, including the member's name. Inside the 24-hour window the member's cancel and reschedule controls are disabled and the refusal is on the page.

## Checks

API behavior is covered with Vitest and Supertest against MongoDB Memory Server. UI rules are covered with Testing Library. One Playwright test signs in as the seeded member, books the first open slot, checks that the slot is gone, and signs in as the professional to see that session. `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e` are the full set of checks.
