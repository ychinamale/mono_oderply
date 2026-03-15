import { useEffect, useState } from 'react';
import axios from 'axios';

import { useAuth } from '../context/AuthContext.tsx';

interface LogEntry {
  id: string;
  triggeredBy: 'OPERATOR' | 'PARTNER_CLAIM';
  fromStatus: string;
  toStatus: string;
  operator: { id: string; name: string } | null;
  partner: { id: string; name: string } | null;
  createdAt: string;
}

interface Pagination {
  totalPages: number;
}

interface Props { panicId: string }

export default function AuditLog({ panicId }: Props) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!token) return;
    void axios
      .get<{ data: LogEntry[]; pagination: Pagination }>(
        `/api/v1/panics/${panicId}/logs?page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then((res) => {
        setLogs(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      });
  }, [token, panicId, page]);

  return (
    <div>
      <h3 className="text-slate-400 text-xs uppercase font-bold tracking-widest mb-3">
        Audit Log
      </h3>
      <ul className="space-y-2">
        {logs.map((log) => {
          const actor =
            log.triggeredBy === 'OPERATOR'
              ? (log.operator?.name ?? 'Operator')
              : (log.partner?.name ?? 'Partner');
          return (
            <li
              key={log.id}
              data-testid={`log-row-${log.id}`}
              className="text-xs font-mono text-slate-400 flex gap-2 items-center"
            >
              <span className={log.triggeredBy === 'OPERATOR' ? 'text-blue-400' : 'text-amber-400'}>
                {log.fromStatus} → {log.toStatus}
              </span>
              <span className="text-slate-500">by {actor}</span>
              <span className="text-slate-600">
                {new Date(log.createdAt).toLocaleTimeString()}
              </span>
            </li>
          );
        })}
      </ul>
      {totalPages > 1 && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-xs text-slate-400 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-slate-500">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="text-xs text-slate-400 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
