import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import apiClient from '../../lib/apiClient.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../hooks/useSocket.tsx';
import AuditLog from '../../components/audit-log/AuditLog.tsx';
import PanicActions from '../../components/panic-actions/PanicActions.tsx';
import { type Panic } from '../../components/panic-card/PanicCard.tsx';

import { useStyles } from './styles.ts';

export default function PanicDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { socket } = useSocket(token);
  const [panic, setPanic] = useState<Panic | null>(null);
  const styles = useStyles();

  const STATUS_BADGE_MAP: Record<string, string> = {
    PENDING:      styles.pendingBadge,
    ACKNOWLEDGED: styles.acknowledgedBadge,
    DISPATCHED:   styles.dispatchedBadge,
    RESOLVED:     styles.resolvedBadge,
  };

  useEffect(() => {
    if (!token || !id) return;
    void apiClient
      .get<Panic>(`/v1/panics/${id}`)
      .then((res) => setPanic(res.data));
  }, [token, id]);

  useEffect(() => {
    if (!socket) return;
    const onUpdated = (updated: Panic) => {
      if (updated.id === id) setPanic(updated);
    };
    socket.on('panic:updated', onUpdated);
    return () => { socket.off('panic:updated', onUpdated); };
  }, [socket, id]);

  if (!panic) return null;

  const badgeClass = STATUS_BADGE_MAP[panic.status] ?? styles.resolvedBadge;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.statusRow}>
          <span className={badgeClass}>
            {panic.status}
          </span>
        </div>
        <div className={styles.details}>
          <p className={styles.partnerName}>{panic.partner.name}</p>
          <p className={styles.fieldMono}>Type: {panic.partner.type}</p>
          <p className={styles.fieldMono}>User: {panic.externalUserId}</p>
          <p className={styles.fieldMono}>
            {panic.latitude}, {panic.longitude}
          </p>
          {panic.metadata && (
            <pre className={styles.metadataBlock}>
              {JSON.stringify(panic.metadata, null, 2)}
            </pre>
          )}
          {panic.claimedByPartner && (
            <p className={styles.fieldMono}>
              Claimed by: {panic.claimedByPartner.name}
            </p>
          )}
          <p className={styles.timestamp}>
            {new Date(panic.createdAt).toLocaleString()}
          </p>
        </div>
        <PanicActions panic={panic} />
        <AuditLog panicId={panic.id} />
      </div>
    </div>
  );
}
