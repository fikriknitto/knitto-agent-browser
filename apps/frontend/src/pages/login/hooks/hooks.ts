import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import z from 'zod';

export type LoginResult = { type: 'success'; message: string } | { type: 'error'; message: string };

export const formLoginSchema = z.object({
  username: z.string().min(1, { message: 'Username wajib diisi' }),
  password: z.string().min(1, { message: 'Password wajib diisi' }),
});

export type FormLoginSchema = z.infer<typeof formLoginSchema>;

const SUCCESS_MESSAGE = 'Login berhasil';
const DEFAULT_ERROR_MESSAGE = 'Terjadi kesalahan saat login';

export function getLoginResult(response: { message?: string } | undefined): LoginResult {
  if (response?.message === SUCCESS_MESSAGE) {
    return { type: 'success', message: SUCCESS_MESSAGE };
  }
  return { type: 'error', message: response?.message ?? 'Terjadi Kesalahan' };
}

function isFetchBaseQueryError(error: unknown): error is FetchBaseQueryError {
  return typeof error === 'object' && error !== null && 'status' in error;
}

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;

  if (isFetchBaseQueryError(error)) {
    const data = (error as FetchBaseQueryError).data;

    if (data && typeof data === 'object' && typeof (data as unknown as { message: string }).message === 'string') {
      return (data as unknown as { message: string }).message;
    }

    if (typeof (error as unknown as { error: string }).error === 'string') {
      return (error as unknown as { error: string }).error;
    }
  }

  return DEFAULT_ERROR_MESSAGE;
}
