import { useEffect, useState } from 'react';
import axios from 'axios';

import { useAuth } from '../context/AuthContext.tsx';

import PanicCard, { type Panic } from './PanicCard.tsx';

export default function PanicFeed() {
  const { token } = useAuth();
  const [panics, setPanics] = useState<Panic[]>([]);

  useEffect(() => {
    if (!token) return;
    void axios
      .get<{ data: Panic[] }>('/api/v1/panics', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setPanics(res.data.data);
      });
  }, [token]);

  return (
    <div>
      {panics.map((p) => (
        <PanicCard key={p.id} panic={p} />
      ))}
    </div>
  );
}
