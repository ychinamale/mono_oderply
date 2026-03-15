import { useRef } from 'react';
import type { Socket } from 'socket.io-client';

export interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: Error | null;
}

export function useSocket(token: string | null): UseSocketReturn {
  void token;
  const socketRef = useRef<Socket | null>(null);

  return { socket: socketRef.current, connected: false, error: null };
}
