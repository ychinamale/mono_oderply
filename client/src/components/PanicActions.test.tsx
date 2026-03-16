import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, type Mock } from 'vitest';

import apiClient from '../lib/apiClient.ts';
import { AuthContext } from '../context/AuthContext.tsx';

import PanicActions from './PanicActions.tsx';
import { type Panic } from './PanicCard.tsx';

vi.mock('../lib/apiClient.ts', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const pending: Panic = {
  id: 'panic-1',
  status: 'PENDING',
  externalUserId: 'u1',
  latitude: -26,
  longitude: 28,
  partner: { id: 'p1', name: 'Src', type: 'PANIC_SOURCE' },
  createdAt: '2026-03-10T10:00:00.000Z',
};

const acknowledged: Panic = { ...pending, id: 'panic-2', status: 'ACKNOWLEDGED' };
const dispatched: Panic = { ...pending, id: 'panic-3', status: 'DISPATCHED' };
const resolved: Panic = { ...pending, id: 'panic-4', status: 'RESOLVED' };

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

  it('renders Dispatch button for an ACKNOWLEDGED panic', () => {
    renderActions(acknowledged);
    expect(screen.getByRole('button', { name: /dispatch/i })).toBeInTheDocument();
  });

  it('renders Resolve button for a DISPATCHED panic', () => {
    renderActions(dispatched);
    expect(screen.getByRole('button', { name: /resolve/i })).toBeInTheDocument();
  });

  it('renders no action button for a RESOLVED panic', () => {
    renderActions(resolved);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('button shows loading state while request is in-flight', async () => {
    (apiClient.post as Mock).mockReturnValueOnce(new Promise(() => {})); // never resolves

    renderActions(pending);

    await userEvent.click(screen.getByRole('button', { name: /acknowledge/i }));

    expect(screen.getByRole('button')).toHaveAttribute('data-loading', 'true');
  });

  it('calls the correct endpoint for each action button', async () => {
    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({});

    const { rerender } = renderActions(pending);
    await userEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
    expect(postSpy).toHaveBeenCalledWith('/v1/panics/panic-1/acknowledge', null);

    rerender(
      <MemoryRouter>
        <AuthContext.Provider
          value={{ token: 'test-token', operator: null, login: vi.fn(), logout: vi.fn() }}
        >
          <PanicActions panic={acknowledged} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /dispatch/i }));
    expect(postSpy).toHaveBeenCalledWith('/v1/panics/panic-2/dispatch', null);

    rerender(
      <MemoryRouter>
        <AuthContext.Provider
          value={{ token: 'test-token', operator: null, login: vi.fn(), logout: vi.fn() }}
        >
          <PanicActions panic={dispatched} />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /resolve/i }));
    expect(postSpy).toHaveBeenCalledWith('/v1/panics/panic-3/resolve', null);
  });

  it('displays inline error when the API returns an error response', async () => {
    (apiClient.post as Mock).mockRejectedValueOnce({
      response: { data: { message: 'Cannot acknowledge a panic with status ACKNOWLEDGED' } },
    });

    renderActions(pending);

    await userEvent.click(screen.getByRole('button', { name: /acknowledge/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot acknowledge a panic with status ACKNOWLEDGED',
    );
  });
});
