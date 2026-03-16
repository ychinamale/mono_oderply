import { Link } from 'react-router-dom';

import PanicActions from '../panic-actions/PanicActions.tsx';

import { useStyles } from './styles.ts';

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
  const styles = useStyles();

  const CARD_MAP: Record<string, { card: string; badge: string }> = {
    PENDING:      { card: styles.pendingCard,      badge: styles.pendingBadge      },
    ACKNOWLEDGED: { card: styles.acknowledgedCard, badge: styles.acknowledgedBadge },
    DISPATCHED:   { card: styles.dispatchedCard,   badge: styles.dispatchedBadge   },
    RESOLVED:     { card: styles.resolvedCard,     badge: styles.resolvedBadge     },
  };
  const cardStyle = CARD_MAP[panic.status] ?? CARD_MAP['RESOLVED'];

  return (
    <Link to={`/panics/${panic.id}`} className={styles.link}>
      <div
        data-testid="panic-card"
        data-status={panic.status}
        data-panic-id={panic.id}
        className={cardStyle.card}
      >
        <div className={styles.cardRow}>
          <span className={cardStyle.badge}>
            {panic.status}
          </span>
          <span className={styles.cardTimestamp}>
            {new Date(panic.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <h4 className={styles.partnerName}>{panic.partner.name}</h4>
        <p className={styles.coords}>
          {panic.latitude.toFixed(3)}, {panic.longitude.toFixed(3)}
        </p>
        <PanicActions panic={panic} />
      </div>
    </Link>
  );
}
