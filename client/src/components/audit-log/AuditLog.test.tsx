import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, type Mock } from 'vitest';

import apiClient from '../../lib/apiClient.ts';
import { AuthContext } from '../../context/AuthContext.tsx';

import AuditLog from './AuditLog.tsx';

vi.mock('../../lib/apiClient.ts', () => ({ default: { get: vi.fn() } }));

function renderLog(panicId = 'panic-1') {
  return render(
    <MemoryRouter>
      <AuthContext.Provider
        value={{ token: 'test-token', operator: null, login: vi.fn(), logout: vi.fn() }}
      >
        <AuditLog panicId={panicId} />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

const logOperator = {
  id: 'log-1',
  panicEventId: 'panic-1',
  triggeredBy: 'OPERATOR',
  fromStatus: 'ACKNOWLEDGED',
  toStatus: 'DISPATCHED',
  operator: { id: 'op1', name: 'Alice' },
  partner: null,
  createdAt: '2026-03-10T11:00:00.000Z',
};

const logPartner = {
  id: 'log-2',
  panicEventId: 'panic-1',
  triggeredBy: 'PARTNER_CLAIM',
  fromStatus: 'PENDING',
  toStatus: 'ACKNOWLEDGED',
  operator: null,
  partner: { id: 'r1', name: 'ResponderCo' },
  createdAt: '2026-03-10T10:30:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuditLog', () => {
  it('renders each log entry as a timeline row', async () => {
    (apiClient.get as Mock).mockResolvedValueOnce({
      data: { data: [logOperator, logPartner], pagination: { totalPages: 1 } },
    });

    renderLog();

    expect(await screen.findByTestId('log-row-log-1')).toBeInTheDocument();
    expect(await screen.findByTestId('log-row-log-2')).toBeInTheDocument();
  });

  it('log entries triggered by OPERATOR show operator name', async () => {
    (apiClient.get as Mock).mockResolvedValueOnce({
      data: { data: [logOperator], pagination: { totalPages: 1 } },
    });

    renderLog();

    const row = await screen.findByTestId('log-row-log-1');
    expect(row).toHaveTextContent('Alice');
  });

  it('log entries triggered by PARTNER_CLAIM show partner name', async () => {
    (apiClient.get as Mock).mockResolvedValueOnce({
      data: { data: [logPartner], pagination: { totalPages: 1 } },
    });

    renderLog();

    const row = await screen.findByTestId('log-row-log-2');
    expect(row).toHaveTextContent('ResponderCo');
  });
});
