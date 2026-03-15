import { useState } from 'react';
import axios from 'axios';

import { useAuth } from '../context/AuthContext.tsx';

import { type Panic } from './PanicCard.tsx';

interface PanicActionsProps {
  panic: Panic;
}

const ACTION_MAP: Record<string, { label: string; endpoint: string } | undefined> = {
  PENDING: { label: 'Acknowledge', endpoint: 'acknowledge' },
  ACKNOWLEDGED: { label: 'Dispatch', endpoint: 'dispatch' },
  DISPATCHED: { label: 'Resolve', endpoint: 'resolve' },
};

export default function PanicActions({ panic }: PanicActionsProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const action = ACTION_MAP[panic.status];
  if (!action) return null;

  function handleClick() {
    setLoading(true);
    setError(null);
    void axios
      .post(`/api/v1/panics/${panic.id}/${action!.endpoint}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .catch((err: { response?: { data?: { message?: string } } }) => {
        setError(err.response?.data?.message ?? 'An error occurred');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <>
      <button type="button" data-loading={loading || undefined} onClick={handleClick}>
        {loading ? 'Loading…' : action.label}
      </button>
      {error && <span role="alert">{error}</span>}
    </>
  );
}
