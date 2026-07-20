import { env } from '@/lib/variables/env';
import { http, HttpResponse } from 'msw';

const BASE_API_URL = env.VITE_BASE_API_URL || 'http://127.0.0.1';

export const authHandlers = [
  http.get(`${BASE_API_URL}/auth/me`, () => {
    return HttpResponse.json({
      message: 'OK',
      result: {
        username: 'admin',
      },
    });
  }),
  http.post(`${BASE_API_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };

    if (body.username !== 'admin' || body.password !== 'admin') {
      return HttpResponse.json(
        {
          message: 'Password atau username salah',
          result: null,
        },
        { status: 401 }
      );
    }

    return HttpResponse.json(
      {
        message: 'Login berhasil',
        result: {
          token: 'mock-token',
          username: body.username,
        },
      },
      { status: 200 }
    );
  }),
];
