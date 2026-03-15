import { useAuth } from '../context/AuthContext.tsx';
import PanicFeed from '../components/PanicFeed.tsx';

export default function Dashboard() {
  const { logout, operator } = useAuth();

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden">
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-16 border-b border-slate-900 flex items-center justify-between px-8 bg-slate-950/80 shrink-0">
          <span className="text-xl font-bold text-white">Dashboard</span>
          <div className="flex items-center gap-4">
            {operator && (
              <span className="text-slate-400 text-sm font-mono">{operator.name}</span>
            )}
            <button
              type="button"
              onClick={logout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="flex flex-1 overflow-hidden">
          <PanicFeed />
        </div>
      </div>
    </div>
  );
}
