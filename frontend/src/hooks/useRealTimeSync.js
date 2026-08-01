import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../utils/api';

const POLL_INTERVAL = 10000; // 10 seconds

export const useRealTimeSync = (endpoints = []) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const lastFetchRef = useRef(0);

  const fetchAll = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetchRef.current < 2000) return; // Debounce 2s
    lastFetchRef.current = now;

    setLoading(true);
    const results = {};
    let hasError = false;

    await Promise.allSettled(
      endpoints.map(async ({ key, url, transform }) => {
        try {
          const res = await api.get(url);
          results[key] = transform ? transform(res.data) : res.data;
        } catch (err) {
          console.error(`[useRealTimeSync] Failed to fetch ${url}:`, err.message);
          hasError = true;
          results[key] = null;
        }
      })
    );

    setData(prev => {
      const merged = { ...prev, ...results };
      return merged;
    });
    setError(hasError ? 'Some data failed to sync' : null);
    setLoading(false);
  }, [endpoints]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  const refresh = useCallback(() => {
    lastFetchRef.current = 0;
    fetchAll();
  }, [fetchAll]);

  return { data, loading, error, refresh };
};

export default useRealTimeSync;