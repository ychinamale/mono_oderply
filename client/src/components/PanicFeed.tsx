import { useEffect, useState } from 'react';
import axios from 'axios';

import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../hooks/useSocket.tsx';

import PanicCard, { type Panic } from './PanicCard.tsx';

export default function PanicFeed() {
  const { token } = useAuth();
  const { socket } = useSocket(token);
  const [panics, setPanics] = useState<Panic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    void axios
      .get<{ data: Panic[] }>('/api/v1/panics', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setPanics(res.data.data);
        setLoading(false);
      })
      .catch(() => {
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

  if (loading) return <div data-testid="loading-skeleton" />;

  return (
    <div>
      {panics.map((p) => (
        <PanicCard key={p.id} panic={p} />
      ))}
    </div>
  );
}
