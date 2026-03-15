export interface Panic {
  id: string;
  status: string;
  externalUserId: string;
  latitude: number;
  longitude: number;
  metadata?: Record<string, unknown>;
  partner: { id: string; name: string; type: string };
  claimedByPartner?: { id: string; name: string; type: string } | null;
  createdAt: string;
}

interface PanicCardProps {
  panic: Panic;
}

export default function PanicCard({ panic }: PanicCardProps) {
  const className = panic.status === 'PENDING' ? 'panic-card panic-card--pending' : 'panic-card';
  return (
    <div data-testid="panic-card" data-status={panic.status} className={className}>
      {panic.id}
    </div>
  );
}
