import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthContext } from '../context/AuthContext.tsx';

import Login from './Login.tsx';

function renderLogin() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ token: null, operator: null, login: () => {}, logout: () => {} }}>
        <Login />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('Login', () => {
  it('renders email and password inputs', () => {
    renderLogin();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
