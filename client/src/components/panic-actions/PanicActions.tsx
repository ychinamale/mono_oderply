import { useState } from 'react';

import apiClient from '../../lib/apiClient.ts';
import { type Panic } from '../panic-card/PanicCard.tsx';

import { useStyles } from './styles.ts';

interface PanicActionsProps {
  panic: Panic;
}

const ACTION_MAP: Record<string, { label: string; endpoint: string } | undefined> = {
  PENDING:      { label: 'Acknowledge', endpoint: 'acknowledge' },
  ACKNOWLEDGED: { label: 'Dispatch',    endpoint: 'dispatch'    },
  DISPATCHED:   { label: 'Resolve',     endpoint: 'resolve'     },
};

export default function PanicActions({ panic }: PanicActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = useStyles();

  const action = ACTION_MAP[panic.status];
  if (!action) return null;

  const BUTTON_CLASS_MAP: Record<string, { active: string; loading: string }> = {
    PENDING:      { active: styles.acknowledgeButton,     loading: styles.acknowledgeButtonLoading },
    ACKNOWLEDGED: { active: styles.dispatchButton,        loading: styles.dispatchButtonLoading    },
    DISPATCHED:   { active: styles.resolveButton,         loading: styles.resolveButtonLoading     },
  };
  const buttonClasses = BUTTON_CLASS_MAP[panic.status];

  function handleClick() {
    setLoading(true);
    setError(null);
    void apiClient
      .post(`/v1/panics/${panic.id}/${action!.endpoint}`, {})
      .catch((err: { response?: { data?: { message?: string } } }) => {
        setError(err.response?.data?.message ?? 'An error occurred');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  return (
    <>
      <button
        type="button"
        data-loading={loading || undefined}
        onClick={handleClick}
        disabled={loading}
        className={loading ? buttonClasses.loading : buttonClasses.active}
      >
        {loading ? 'Loading…' : action.label}
      </button>
      {error && <span role="alert" className={styles.errorText}>{error}</span>}
    </>
  );
}
