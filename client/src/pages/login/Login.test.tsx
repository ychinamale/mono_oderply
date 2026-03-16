import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { vi } from 'vitest';

import apiClient from '../../lib/apiClient.ts';
import { AuthContext } from '../../context/AuthContext.tsx';

import Login from './Login.page.tsx';

function CurrentPath() {
  return <span data-testid="path">{useLocation().pathname}</span>;
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthContext.Provider value={{ token: null, operator: null, login: () => {}, logout: () => {} }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<CurrentPath />} />
        </Routes>
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

  it('redirects to dashboard on successful login', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      data: { token: 'test-token', operator: { id: '1', email: 'op@test.com', name: 'Op' } },
    });
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'op@test.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'correct');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByTestId('path')).toHaveTextContent('/dashboard');
  });

  it('displays an inline error message on failed login', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce({ response: { status: 401 } });
    renderLogin();
    await userEvent.type(screen.getByLabelText(/email/i), 'bad@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrongpass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
