import { Link } from 'react-router-dom';

import PanicActions from './PanicActions.tsx';

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

const STATUS_STYLES: Record<string, { border: string; bg: string; badge: string } | undefined> = {
  PENDING:      { border: 'border-l-red-500',    bg: 'bg-red-500/5',    badge: 'text-red-500'    },
  ACKNOWLEDGED: { border: 'border-l-amber-500',  bg: 'bg-amber-500/5',  badge: 'text-amber-500'  },
  DISPATCHED:   { border: 'border-l-blue-500',   bg: 'bg-blue-500/5',   badge: 'text-blue-400'   },
  RESOLVED:     { border: 'border-l-slate-500',  bg: 'bg-slate-500/5',  badge: 'text-slate-500'  },
};

export default function PanicCard({ panic }: PanicCardProps) {
  const style = STATUS_STYLES[panic.status] ?? STATUS_STYLES['RESOLVED']!;

  return (
    <Link to={`/panics/${panic.id}`} className="block">
    <div
      data-testid="panic-card"
      data-status={panic.status}
      data-panic-id={panic.id}
      className={`p-4 border-l-4 mb-2 rounded-r-xl border-y border-r border-transparent ${style.border} ${style.bg}`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className={`text-[10px] uppercase font-bold tracking-widest ${style.badge}`}>
          {panic.status}
        </span>
        <span className="text-slate-500 text-[10px] font-mono">
          {new Date(panic.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <h4 className="text-white font-bold text-sm truncate">{panic.partner.name}</h4>
      <p className="text-slate-400 text-xs mt-1 font-mono">
        {panic.latitude.toFixed(3)}, {panic.longitude.toFixed(3)}
      </p>
      <PanicActions panic={panic} />
    </div>
    </Link>
  );
}
