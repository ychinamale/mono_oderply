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
  const action = ACTION_MAP[panic.status];
  if (!action) return null;
  return <button type="button">{action.label}</button>;
}
