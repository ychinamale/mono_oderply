import { useEffect, useState } from 'react';
import axios from 'axios';

import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../hooks/useSocket.tsx';

import PanicCard, { type Panic } from './PanicCard.tsx';

export default function PanicFeed() {
  const { token } = useAuth();
  const { socket } = useSocket(token);
  const [panics, setPanics] = useState<Panic[]>([]);

  useEffect(() => {
    if (!token) return;
    void axios
      .get<{ data: Panic[] }>('/api/v1/panics', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setPanics(res.data.data);
      });
  }, [token]);

  useEffect(() => {
    if (!socket) return;

    const onNew = (panic: Panic) => setPanics((prev) => [panic, ...prev]);
    socket.on('panic:new', onNew);

    return () => {
      socket.off('panic:new', onNew);
    };
  }, [socket]);

  return (
    <div>
      {panics.map((p) => (
        <PanicCard key={p.id} panic={p} />
      ))}
    </div>
  );
}
