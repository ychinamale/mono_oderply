import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { AuthContext, AuthProvider } from './AuthContext.tsx';

function TestHarness() {
  return (
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthProvider>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <AuthContext.Consumer>
                {({ token, login, logout }) => (
                  <div>
                    <span data-testid="token">{token ?? 'null'}</span>
                    <button
                      type="button"
                      onClick={() => login('test-token', { id: '1', email: 'op@test.com', name: 'Op' })}
                    >
                      Login
                    </button>
                    <button type="button" onClick={logout}>
                      Logout
                    </button>
                  </div>
                )}
              </AuthContext.Consumer>
            }
          />
          <Route path="/login" element={<span>login page</span>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('AuthContext', () => {
  it('logout clears token from AuthContext and redirects to /login', async () => {
    render(<TestHarness />);
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
    expect(screen.getByTestId('token')).toHaveTextContent('test-token');
    await userEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });
});
