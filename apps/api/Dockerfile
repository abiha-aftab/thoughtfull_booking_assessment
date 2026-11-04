FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm ci

COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY packages/shared packages/shared

EXPOSE 4000

# Inserts demo accounts only when they are missing, then starts the API.
CMD ["sh", "-c", "npm run seed -w @thoughtfull/api && npm run start -w @thoughtfull/api"]
