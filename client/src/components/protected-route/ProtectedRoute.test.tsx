import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { AuthContext } from '../../context/AuthContext.tsx';

import ProtectedRoute from './ProtectedRoute.tsx';

function renderProtectedRoute(token: string | null) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <AuthContext.Provider value={{ token, operator: null, login: () => {}, logout: () => {} }}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <span>protected content</span>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<span>login page</span>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('redirects to /login when no token is in AuthContext', () => {
    renderProtectedRoute(null);
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('renders children when token is present in AuthContext', () => {
    renderProtectedRoute('valid-token');
    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});
