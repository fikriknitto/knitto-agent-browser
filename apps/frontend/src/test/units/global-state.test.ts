import { describe, expect, it } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import layoutReducer, { toggleSidebar } from '@/redux/layoutSlice';

describe('Penggunaan global state redux', () => {
  it('seharusnya menampilkan nilai awal false', () => {
    const store = configureStore({ reducer: { layout: layoutReducer } });
    expect(store.getState().layout.isSidebarOpen).toBe(false);
  });

  it('seharusnya menampilkan nilai true', () => {
    const store = configureStore({ reducer: { layout: layoutReducer } });
    store.dispatch(toggleSidebar());
    expect(store.getState().layout.isSidebarOpen).toBe(true);
  });

  it('seharusnya menampilkan nilai false -> true -> false', () => {
    const store = configureStore({ reducer: { layout: layoutReducer } });

    expect(store.getState().layout.isSidebarOpen).toBe(false);

    store.dispatch(toggleSidebar());
    expect(store.getState().layout.isSidebarOpen).toBe(true);

    store.dispatch(toggleSidebar());
    expect(store.getState().layout.isSidebarOpen).toBe(false);
  });
});
