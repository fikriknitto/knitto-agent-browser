import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { KnittoProvider, readStoredTheme } from '@knittotextile/react-ui';
import App from './App';
import store from './redux/store';
import './styles/main.css';
import { env } from './lib/variables/env';

const useMockApi = env.VITE_ENVIRONTMENT === 'DEVELOPMENT' && env.VITE_USE_MOCK_API === 'true';

if (useMockApi) {
  import('@/test/mocks/browser').then(({ server }) => {
    server.start({ onUnhandledRequest: 'error' });
  });
}

const initialTheme = readStoredTheme() ?? 'system';

ReactDOM.createRoot(document.getElementById('root') as HTMLDivElement).render(
  <React.StrictMode>
    <KnittoProvider defaultTheme={initialTheme} showSystemOption defaultToastPosition="bottom-right" defaultToastDuration={10000}>
      <Provider store={store}>
        <App />
      </Provider>
    </KnittoProvider>
  </React.StrictMode>
);
