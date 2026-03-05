import { useState, useEffect } from 'react';
import * as api from '../lib/api';
import type { StatsData } from '../lib/api';

export function useStats() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats()
      .then(setStats)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}
