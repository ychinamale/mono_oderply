import { useEffect, useState } from 'react';

import apiClient from '../../lib/apiClient.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useSocket } from '../../hooks/useSocket.tsx';
import PanicCard, { type Panic } from '../panic-card/PanicCard.tsx';

import { useStyles } from './styles.ts';

export default function PanicFeed() {
  const { token } = useAuth();
  const { socket } = useSocket(token);
  const [panics, setPanics] = useState<Panic[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const styles = useStyles();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void apiClient
      .get<{ data: Panic[] }>('/v1/panics')
      .then((res) => {
        setPanics(res.data.data);
        setLoading(false);
      })
      .catch(() => {
        setFetchError(true);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const onNew = (panic: Panic) => setPanics((prev) => [panic, ...prev]);
    const onUpdated = (panic: Panic) =>
      setPanics((prev) => prev.map((p) => (p.id === panic.id ? panic : p)));

    socket.on('panic:new', onNew);
    socket.on('panic:updated', onUpdated);

    return () => {
      socket.off('panic:new', onNew);
      socket.off('panic:updated', onUpdated);
    };
  }, [socket]);

  if (loading) {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h2 className={styles.feedTitle}>Panic Feed</h2>
          <div className={styles.liveGroup}>
            <span className={styles.idleDot} />
            <span className={styles.liveLabel}>Live</span>
          </div>
        </div>
        <div className={styles.skeletonList} data-testid="loading-skeleton">
          {[1, 2, 3].map((n) => (
            <div key={n} className={styles.skeletonItem} />
          ))}
        </div>
      </aside>
    );
  }

  if (fetchError) {
    return (
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <h2 className={styles.feedTitle}>Panic Feed</h2>
        </div>
        <div role="alert" className={styles.errorAlert}>Failed to load panics</div>
      </aside>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <h2 className={styles.feedTitle}>Panic Feed</h2>
        <div className={styles.liveGroup}>
          <span className={styles.liveDot} />
          <span className={styles.liveLabel}>Live</span>
        </div>
      </div>
      <div className={styles.feedList}>
        {panics.map((p) => (
          <PanicCard key={p.id} panic={p} />
        ))}
      </div>
    </aside>
  );
}
