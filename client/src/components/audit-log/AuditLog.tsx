import { useEffect, useState } from 'react';

import apiClient from '../../lib/apiClient.ts';
import { useAuth } from '../../context/AuthContext.tsx';

import { useStyles } from './styles.ts';

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
  const styles = useStyles();

  useEffect(() => {
    if (!token) return;
    void apiClient
      .get<{ data: LogEntry[]; pagination: Pagination }>(
        `/v1/panics/${panicId}/logs?page=${page}&limit=20`,
      )
      .then((res) => {
        setLogs(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      });
  }, [token, panicId, page]);

  return (
    <div>
      <h3 className={styles.sectionLabel}>
        Audit Log
      </h3>
      <ul className={styles.logList}>
        {logs.map((log) => {
          const actor =
            log.triggeredBy === 'OPERATOR'
              ? (log.operator?.name ?? 'Operator')
              : (log.partner?.name ?? 'Partner');
          return (
            <li
              key={log.id}
              data-testid={`log-row-${log.id}`}
              className={styles.logRow}
            >
              <span className={log.triggeredBy === 'OPERATOR' ? styles.operatorTransition : styles.partnerTransition}>
                {log.fromStatus} → {log.toStatus}
              </span>
              <span className={styles.actor}>by {actor}</span>
              <span className={styles.logTime}>
                {new Date(log.createdAt).toLocaleTimeString()}
              </span>
            </li>
          );
        })}
      </ul>
      {totalPages > 1 && (
        <div className={styles.paginationRow}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className={styles.paginationButton}
          >
            Prev
          </button>
          <span className={styles.pageIndicator}>{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className={styles.paginationButton}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
