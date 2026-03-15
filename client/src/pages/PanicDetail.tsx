import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

import { useAuth } from '../context/AuthContext.tsx';
import { useSocket } from '../hooks/useSocket.tsx';
import AuditLog from '../components/AuditLog.tsx';
import PanicActions from '../components/PanicActions.tsx';
import { type Panic } from '../components/PanicCard.tsx';

const STATUS_STYLES: Record<string, string | undefined> = {
  PENDING:      'text-red-500',
  ACKNOWLEDGED: 'text-amber-500',
  DISPATCHED:   'text-blue-400',
  RESOLVED:     'text-slate-500',
};

export default function PanicDetail() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { socket } = useSocket(token);
  const [panic, setPanic] = useState<Panic | null>(null);

  useEffect(() => {
    if (!token || !id) return;
    void axios
      .get<Panic>(`/api/v1/panics/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
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

  const badgeClass = STATUS_STYLES[panic.status] ?? 'text-slate-500';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <span className={`text-xs uppercase font-bold tracking-widest ${badgeClass}`}>
            {panic.status}
          </span>
        </div>
        <div className="space-y-2">
          <p className="text-white font-bold text-lg">{panic.partner.name}</p>
          <p className="text-slate-400 text-xs font-mono">Type: {panic.partner.type}</p>
          <p className="text-slate-400 text-xs font-mono">User: {panic.externalUserId}</p>
          <p className="text-slate-400 text-xs font-mono">
            {panic.latitude}, {panic.longitude}
          </p>
          {panic.metadata && (
            <pre className="text-slate-400 text-xs font-mono bg-slate-900 p-2 rounded">
              {JSON.stringify(panic.metadata, null, 2)}
            </pre>
          )}
          {panic.claimedByPartner && (
            <p className="text-slate-400 text-xs font-mono">
              Claimed by: {panic.claimedByPartner.name}
            </p>
          )}
          <p className="text-slate-500 text-xs font-mono">
            {new Date(panic.createdAt).toLocaleString()}
          </p>
        </div>
        <PanicActions panic={panic} />
        <AuditLog panicId={panic.id} />
      </div>
    </div>
  );
}
