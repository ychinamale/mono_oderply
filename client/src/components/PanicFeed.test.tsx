import { render, screen } from '@testing-library/react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MemoryRouter } from 'react-router-dom';
import { vi, type Mock } from 'vitest';

import { AuthContext } from '../context/AuthContext.tsx';

import PanicFeed from './PanicFeed.tsx';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
vi.mock('axios');

const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
};

function renderFeed() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{ token: 'test-token', operator: null, login: vi.fn(), logout: vi.fn() }}
      >
        <PanicFeed />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

const panicA = {
  id: 'panic-a',
  status: 'PENDING',
  externalUserId: 'u1',
  latitude: -26,
  longitude: 28,
  partner: { id: 'p1', name: 'Src', type: 'PANIC_SOURCE' },
  createdAt: '2026-03-10T10:00:00.000Z',
};

const panicB = {
  id: 'panic-b',
  status: 'ACKNOWLEDGED',
  externalUserId: 'u2',
  latitude: -27,
  longitude: 29,
  partner: { id: 'p1', name: 'Src', type: 'PANIC_SOURCE' },
  createdAt: '2026-03-10T09:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  (io as Mock).mockReturnValue(mockSocket);
});

describe('PanicFeed', () => {
  it('renders a PanicCard for each panic in the initial fetch response', async () => {
    (axios.get as Mock).mockResolvedValueOnce({
      data: { data: [panicA, panicB] },
    });

    renderFeed();

    expect(await screen.findAllByTestId('panic-card')).toHaveLength(2);
  });
});
