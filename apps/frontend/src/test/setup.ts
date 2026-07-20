import 'vitest-browser-react';
import '../../src/styles/main.css';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/test/mocks/browser';

beforeAll(async () => {
  await server.start({
    onUnhandledRequest: 'error',
  });
});
afterEach(() => server.resetHandlers());
afterAll(async () => {
  await server.stop();
});
