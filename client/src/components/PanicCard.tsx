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
  return <div data-testid="panic-card">{panic.id}</div>;
}
