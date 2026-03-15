import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { AuthContext } from '../context/AuthContext.tsx';

import PanicActions from './PanicActions.tsx';
import { type Panic } from './PanicCard.tsx';

vi.mock('axios');

const pending: Panic = {
  id: 'panic-1',
  status: 'PENDING',
  externalUserId: 'u1',
  latitude: -26,
  longitude: 28,
  partner: { id: 'p1', name: 'Src', type: 'PANIC_SOURCE' },
  createdAt: '2026-03-10T10:00:00.000Z',
};

function renderActions(panic: Panic) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{ token: 'test-token', operator: null, login: vi.fn(), logout: vi.fn() }}
      >
        <PanicActions panic={panic} />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('PanicActions', () => {
  it('renders Acknowledge button for a PENDING panic', () => {
    renderActions(pending);
    expect(screen.getByRole('button', { name: /acknowledge/i })).toBeInTheDocument();
  });
});
