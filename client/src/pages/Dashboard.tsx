import { useAuth } from '../context/AuthContext.tsx';

export default function Dashboard() {
  const { logout } = useAuth();

  return (
    <div>
      <span>Dashboard</span>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}
