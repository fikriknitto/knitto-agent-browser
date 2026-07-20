import store from '@/redux/store';
import { KnittoProvider } from '@knittotextile/react-ui';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render } from 'vitest-browser-react';

function renderWithProviders(ui: React.ReactElement, { initialEntries = ['/'] }: { initialEntries?: string[] } = {}) {
  return render(
    <KnittoProvider defaultTheme="light">
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </Provider>
    </KnittoProvider>
  );
}

export { renderWithProviders };
