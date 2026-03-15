import { type Panic } from './PanicCard.tsx';

interface PanicActionsProps {
  panic: Panic;
}

export default function PanicActions({ panic }: PanicActionsProps) {
  if (panic.status === '') return null;
  return null;
}
