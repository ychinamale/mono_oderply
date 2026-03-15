import { useAuth } from '../context/AuthContext.tsx';
import PanicFeed from '../components/PanicFeed.tsx';

export default function Dashboard() {
  const { logout } = useAuth();

  return (
    <div>
      <div>
        <span>Dashboard</span>
        <button type="button" onClick={logout}>
          Logout
        </button>
      </div>
      <PanicFeed />
    </div>
  );
}
