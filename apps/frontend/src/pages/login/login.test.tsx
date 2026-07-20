import { describe, expect, it } from 'vitest';
import { formLoginSchema, getLoginErrorMessage, getLoginResult } from './hooks/hooks';

describe('Form Login Schema', () => {
  it('seharusnya validasi input sukses', () => {
    expect(formLoginSchema.parse({ username: 'admin', password: 'admin' })).toEqual({ username: 'admin', password: 'admin' });
  });

  it('seharusnya validasi input gagal ketika username kosong', () => {
    expect(() => formLoginSchema.parse({ username: '', password: 'admin' })).toThrow('Username wajib diisi');
  });

  it('seharusnya validasi input gagal ketika password kosong', () => {
    expect(() => formLoginSchema.parse({ username: 'admin', password: '' })).toThrow('Password wajib diisi');
  });

  it('seharusnya validasi input gagal ketika username dan password kosong', () => {
    expect(() => formLoginSchema.parse({ username: '', password: '' })).toThrow();
  });
});

describe('Login Result', () => {
  it('seharusnya mengembalikan success ketika message === success', () => {
    expect(getLoginResult({ message: 'Login berhasil' })).toEqual({ type: 'success', message: 'Login berhasil' });
  });

  it('seharusnya mengembalikan error ketika message !== success', () => {
    expect(getLoginResult({ message: 'Invalid credentials' })).toEqual({
      type: 'error',
      message: 'Invalid credentials',
    });
  });

  it('seharusnya mengembalikan error dengan message default ketika message tidak diberikan', () => {
    expect(getLoginResult({})).toEqual({
      type: 'error',
      message: 'Terjadi Kesalahan',
    });
  });

  it('seharusnya mengembalikan error dengan message default ketika message undefined', () => {
    expect(getLoginResult(undefined)).toEqual({
      type: 'error',
      message: 'Terjadi Kesalahan',
    });
  });
});

describe('Login Error Message', () => {
  it('seharusnya mengembalikan pesan kesalahan ketika thrown error', () => {
    expect(getLoginErrorMessage(new Error('Network error'))).toBe('Network error');
  });

  it('seharusnya mengembalikan pesan kesalahan default ketika thrown error adalah null atau undefined', () => {
    expect(getLoginErrorMessage(null)).toBe('Terjadi kesalahan saat login');
    expect(getLoginErrorMessage(undefined)).toBe('Terjadi kesalahan saat login');
  });

  it('seharusnya mengembalikan pesan kesalahan default ketika thrown error tidak ada pesan', () => {
    expect(getLoginErrorMessage({})).toBe('Terjadi kesalahan saat login');
  });
});
