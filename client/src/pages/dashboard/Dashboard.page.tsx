import { useAuth } from '../../context/AuthContext.tsx';
import PanicFeed from '../../components/panic-feed/PanicFeed.tsx';

import { useStyles } from './styles.ts';

export default function Dashboard() {
  const { logout, operator } = useAuth();
  const styles = useStyles();

  return (
    <div className={styles.page}>
      <div className={styles.column}>
        <header className={styles.header}>
          <span className={styles.appTitle}>Dashboard</span>
          <div className={styles.headerRight}>
            {operator && (
              <span className={styles.operatorName}>{operator.name}</span>
            )}
            <button
              type="button"
              onClick={logout}
              className={styles.logoutButton}
            >
              Logout
            </button>
          </div>
        </header>
        <div className={styles.content}>
          <PanicFeed />
        </div>
      </div>
    </div>
  );
}
