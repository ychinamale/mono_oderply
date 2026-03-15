import { render, screen, act } from '@testing-library/react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MemoryRouter } from 'react-router-dom';
import { vi, type Mock } from 'vitest';

import { AuthContext } from '../context/AuthContext.tsx';

import PanicFeed from './PanicFeed.tsx';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
vi.mock('axios');

const socketHandlers: Record<string, (data: unknown) => void> = {};

const mockSocket = {
  on: vi.fn((event: string, handler: (data: unknown) => void) => {
    socketHandlers[event] = handler;
  }),
  off: vi.fn(),
  disconnect: vi.fn(),
};

function emitSocket(event: string, data: unknown) {
  socketHandlers[event]?.(data);
}

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

const panicC = {
  id: 'panic-c',
  status: 'PENDING',
  externalUserId: 'u3',
  latitude: -28,
  longitude: 30,
  partner: { id: 'p1', name: 'Src', type: 'PANIC_SOURCE' },
  createdAt: '2026-03-10T11:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  // reset captured handlers between tests
  for (const key of Object.keys(socketHandlers)) delete socketHandlers[key];
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

  it('updates the correct PanicCard when panic:updated socket event is received', async () => {
    (axios.get as Mock).mockResolvedValueOnce({
      data: { data: [panicA, panicB] },
    });

    renderFeed();

    await screen.findAllByTestId('panic-card');

    const updatedA = { ...panicA, status: 'ACKNOWLEDGED' };
    act(() => emitSocket('panic:updated', updatedA));

    const cards = screen.getAllByTestId('panic-card');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveAttribute('data-status', 'ACKNOWLEDGED');
  });

  it('prepends a new PanicCard when panic:new socket event is received', async () => {
    (axios.get as Mock).mockResolvedValueOnce({
      data: { data: [panicA, panicB] },
    });

    renderFeed();

    await screen.findAllByTestId('panic-card');

    act(() => emitSocket('panic:new', panicC));

    const cards = screen.getAllByTestId('panic-card');
    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent('panic-c');
  });
});
