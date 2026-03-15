import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

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

  it('displays an inline error message on failed login', async () => {
    vi.spyOn(axios, 'post').mockRejectedValueOnce({ response: { status: 401 } });
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
