import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: Error | null;
}

export function useSocket(token: string | null): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!token) return;

    const s = io({ auth: { token } });
    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (err) => setError(err));

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [token]);

  return { socket, connected, error };
}
