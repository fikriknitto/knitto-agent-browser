import { describe, expect, it } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { act } from 'react';
import { useModal } from '@/lib/hooks/hooks';

describe('Penggunaan hook useModal', () => {
  it('default: show false, modalName undefined, data null', async () => {
    const { result } = await renderHook(() => useModal<'modal-test'>());

    expect(result.current.show).toBe(false);
    expect(result.current.modalName).toBeUndefined();
    expect(result.current.data).toBeNull();
  });

  it('showModal: set show true + modalName', async () => {
    const { result } = await renderHook(() => useModal<'modal-test'>());

    act(() => result.current.showModal('modal-test'));

    expect(result.current.show).toBe(true);
    expect(result.current.modalName).toBe('modal-test');
  });

  it('hideModal: reset show + modalName + remove body class', async () => {
    const { result } = await renderHook(() => useModal<'modal-test'>());

    act(() => result.current.showModal('modal-test'));
    document.body.classList.add('modal-open');

    act(() => result.current.hideModal());

    expect(result.current.show).toBe(false);
    expect(result.current.modalName).toBeUndefined();
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('showModal dengan data: menyimpan data (kalau data truthy)', async () => {
    const { result } = await renderHook(() => useModal<'modal-test', { id: number }>());

    act(() => result.current.showModal('modal-test', { id: 123 }));

    expect(result.current.data).toEqual({ id: 123 });
  });
});
