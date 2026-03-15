import { render, screen } from '@testing-library/react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, type Mock } from 'vitest';

import { AuthContext } from '../context/AuthContext.tsx';

import PanicDetail from './PanicDetail.tsx';

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

export function emitSocket(event: string, data: unknown) {
  socketHandlers[event]?.(data);
}

const panic = {
  id: 'panic-1',
  status: 'PENDING',
  externalUserId: 'ext-user-42',
  latitude: -26.123,
  longitude: 28.456,
  partner: { id: 'p1', name: 'SourceCo', type: 'PANIC_SOURCE' },
  claimedByPartner: null,
  createdAt: '2026-03-10T10:00:00.000Z',
};

function renderDetail(id = 'panic-1') {
  return render(
    <MemoryRouter initialEntries={[`/panics/${id}`]}>
      <AuthContext.Provider
        value={{ token: 'test-token', operator: null, login: vi.fn(), logout: vi.fn() }}
      >
        <Routes>
          <Route path="/panics/:id" element={<PanicDetail />} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(socketHandlers)) delete socketHandlers[key];
  (io as Mock).mockReturnValue(mockSocket);
});

describe('PanicDetail', () => {
  it('renders status badge, partner name, coordinates, and createdAt', async () => {
    (axios.get as Mock).mockResolvedValueOnce({ data: panic });

    renderDetail();

    expect(await screen.findByText('PENDING')).toBeInTheDocument();
    expect(await screen.findByText('SourceCo')).toBeInTheDocument();
    expect(await screen.findByText(/-26\.123/)).toBeInTheDocument();
    expect(await screen.findByText(/28\.456/)).toBeInTheDocument();
    expect(await screen.findByText(/2026/)).toBeInTheDocument();
  });

  it('renders claimedByPartner name when panic has been claimed', async () => {
    const claimed = {
      ...panic,
      status: 'ACKNOWLEDGED',
      claimedByPartner: { id: 'r1', name: 'ResponderCo', type: 'RESPONDER_SYSTEM' },
    };
    (axios.get as Mock).mockResolvedValueOnce({ data: claimed });

    renderDetail();

    expect(await screen.findByText(/ResponderCo/)).toBeInTheDocument();
  });
});
