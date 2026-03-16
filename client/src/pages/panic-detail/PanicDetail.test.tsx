import { render, screen, act } from '@testing-library/react';
import { io } from 'socket.io-client';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi, type Mock } from 'vitest';

import apiClient from '../../lib/apiClient.ts';
import { AuthContext } from '../../context/AuthContext.tsx';

import PanicDetail from './PanicDetail.page.tsx';

vi.mock('socket.io-client', () => ({ io: vi.fn() }));
vi.mock('../../lib/apiClient.ts', () => ({ default: { get: vi.fn() } }));

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

const emptyLogs = { data: { data: [], pagination: { totalPages: 1 } } };

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(socketHandlers)) delete socketHandlers[key];
  (io as Mock).mockReturnValue(mockSocket);
  // AuditLog is rendered inside PanicDetail; queue a default empty-logs response
  // so every test's second apiClient.get (for /logs) resolves cleanly.
  (apiClient.get as Mock).mockResolvedValue(emptyLogs);
});

describe('PanicDetail', () => {
  it('renders status badge, partner name, coordinates, and createdAt', async () => {
    (apiClient.get as Mock).mockResolvedValueOnce({ data: panic });

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
    (apiClient.get as Mock).mockResolvedValueOnce({ data: claimed });

    renderDetail();

    expect(await screen.findByText(/ResponderCo/)).toBeInTheDocument();
  });

  it('does not render claimedByPartner section when panic is unclaimed', async () => {
    (apiClient.get as Mock).mockResolvedValueOnce({ data: panic }); // claimedByPartner: null

    renderDetail();

    await screen.findByText('PENDING');
    expect(screen.queryByText(/Claimed by:/i)).not.toBeInTheDocument();
  });

  it('updates detail view when panic:updated event is received for the current panic', async () => {
    (apiClient.get as Mock).mockResolvedValueOnce({ data: panic });

    renderDetail();
    await screen.findByText('PENDING');

    const updated = { ...panic, status: 'ACKNOWLEDGED' };
    act(() => emitSocket('panic:updated', updated));

    expect(await screen.findByText('ACKNOWLEDGED')).toBeInTheDocument();
  });

  it('does not update detail view when panic:updated event is for a different panic', async () => {
    (apiClient.get as Mock).mockResolvedValueOnce({ data: panic });

    renderDetail();
    await screen.findByText('PENDING');

    const other = { ...panic, id: 'panic-other', status: 'RESOLVED' };
    act(() => emitSocket('panic:updated', other));

    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.queryByText('RESOLVED')).not.toBeInTheDocument();
  });
});
