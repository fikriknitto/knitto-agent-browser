import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';
import generateEnvPlugin from './config/generate-env-plugin';
import { playwright } from '@vitest/browser-playwright';
/// <reference types="vitest" />

const manifestForPlugIn = {
  registerType: 'prompt',
  includeAssests: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
  manifest: {
    name: 'Template React Typescript Knitto v0.1.0',
    short_name: 'template-react-typescript-knitto',
    description: 'Template React Typescript Knitto using Vite and React',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'favicon',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'favicon_',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'apple touch icon',
      },
      {
        src: '/maskable_icon.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    theme_color: '#ffffff',
    background_color: '#ffffff',
  },
};

export default defineConfig({
  plugins: [
    tailwindcss(),
    generateEnvPlugin(),
    VitePWA({
      ...manifestForPlugIn,
      registerType: 'autoUpdate',
      // Off in dev — SW cache interferes with local WS/backend hot reload.
      devOptions: { enabled: false },
    }),
    react(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', '@knittotextile/react-ui'],
  },
  server: {
    port: Number(process.env.VITE_DEV_PORT || 3000),
    host: true,
  },
  test: {
    globals: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', '**/*.d.ts', 'src/components/ui/knitto-table/**'],
    },
    setupFiles: './src/test/setup.ts',
    // Browser mode enabled later (Fase 7); keep unit-friendly default for monorepo CI.
    browser: {
      enabled: false,
      provider: playwright(),
      instances: [{ browser: 'chromium' }],
      viewport: { width: 1920, height: 1080 },
    },
  },
});
