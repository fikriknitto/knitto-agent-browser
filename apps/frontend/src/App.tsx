import loadable from '@loadable/component';
import type { ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { env } from './lib/variables/env';

// Cast: @loadable/component + React 18 types mismatch under pnpm dedupe.
const AppShell = loadable(() => import('./pages/app-shell')) as ComponentType;
const LoginPage = loadable(() => import('./pages/login')) as ComponentType;

function App() {
  // PWA off in development — SW cache interferes with local WS/backend.
  const enableSw =
    env.VITE_ENVIRONTMENT !== 'DEVELOPMENT' && env.VITE_USE_MOCK_API !== 'true';
  if (enableSw) {
    registerSW({ immediate: true });
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<AppShell />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
