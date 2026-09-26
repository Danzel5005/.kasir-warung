import { useState, useEffect, useCallback, useRef } from 'react';
import { dataApi } from '../services/api';

/**
 * Hook that fetches data and auto-refreshes every 5 minutes.
 * @param {Function} fetchFn - async function that returns data
 * @param {Array} deps - dependency array for refetch
 * @returns {Object} { data, loading, error, lastUpdated, refresh }
 */
export function useDataSync(fetchFn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const fetchRef = useRef(fetchFn);

  // Keep latest fetchFn without retriggering effect
  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const result = await fetchRef.current();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);

    // Auto-refresh every 5 minutes
    intervalRef.current = setInterval(() => {
      load(false);
    }, 5 * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: () => load(false)
  };
}

export default useDataSync;
