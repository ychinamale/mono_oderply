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
  const [fetchError, setFetchError] = useState(false);

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
      <aside className="w-80 border-r border-slate-900 flex flex-col bg-slate-950/50 h-full">
        <div className="p-4 border-b border-slate-900 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Panic Feed</h2>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-700" />
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live</span>
          </div>
        </div>
        <div className="flex-1 p-4 space-y-2" data-testid="loading-skeleton">
          {[1, 2, 3].map((n) => (
            <div key={n} className="animate-pulse bg-slate-800 rounded-xl h-20" />
          ))}
        </div>
      </aside>
    );
  }

  if (fetchError) {
    return (
      <aside className="w-80 border-r border-slate-900 flex flex-col bg-slate-950/50 h-full">
        <div className="p-4 border-b border-slate-900">
          <h2 className="text-lg font-bold text-white">Panic Feed</h2>
        </div>
        <div role="alert" className="text-red-400 p-4 text-sm">Failed to load panics</div>
      </aside>
    );
  }

  return (
    <aside className="w-80 border-r border-slate-900 flex flex-col bg-slate-950/50 h-full">
      <div className="p-4 border-b border-slate-900 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Panic Feed</h2>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Live</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {panics.map((p) => (
          <PanicCard key={p.id} panic={p} />
        ))}
      </div>
    </aside>
  );
}
