import { useState } from 'react';

import apiClient from '../lib/apiClient.ts';

import { type Panic } from './PanicCard.tsx';

interface PanicActionsProps {
  panic: Panic;
}

const ACTION_MAP: Record<string, { label: string; endpoint: string; className: string } | undefined> = {
  PENDING:      { label: 'Acknowledge', endpoint: 'acknowledge', className: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20'     },
  ACKNOWLEDGED: { label: 'Dispatch',    endpoint: 'dispatch',    className: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20'  },
  DISPATCHED:   { label: 'Resolve',     endpoint: 'resolve',     className: 'bg-emerald-600 hover:bg-emerald-500 text-white'                         },
};

export default function PanicActions({ panic }: PanicActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const action = ACTION_MAP[panic.status];
  if (!action) return null;

  function handleClick() {
    setLoading(true);
    setError(null);
    void apiClient
      .post(`/v1/panics/${panic.id}/${action!.endpoint}`, null)
      .catch((err: { response?: { data?: { message?: string } } }) => {
        setError(err.response?.data?.message ?? 'An error occurred');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  const baseClass = 'px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 w-full mt-3';
  const loadingClass = loading ? 'opacity-60 cursor-not-allowed' : '';

  return (
    <>
      <button
        type="button"
        data-loading={loading || undefined}
        onClick={handleClick}
        disabled={loading}
        className={`${baseClass} ${action.className} ${loadingClass}`}
      >
        {loading ? 'Loading…' : action.label}
      </button>
      {error && <span role="alert" className="text-red-400 text-xs mt-1 block">{error}</span>}
    </>
  );
}
