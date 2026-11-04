import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      API_PORT: '4000',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/thoughtfull-booking-test',
      WEB_ORIGIN: 'http://localhost:5173',
    },
  },
});
