import { useState, useCallback, useRef, useEffect } from 'react';
import * as api from '../lib/api';
import type { SearchResult, IndexingStatus } from '../lib/api';

const PAGE_SIZE = 20;

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [indexingStatus, setIndexingStatus] = useState<IndexingStatus | null>(null);
  const [page, setPage] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const doSearch = useCallback(async (q: string, p: number) => {
    if (!q.trim()) {
      setResults([]);
      setTotal(0);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const offset = (p - 1) * PAGE_SIZE;
      const data = await api.search(q, PAGE_SIZE, offset);
      setResults(data.results);
      setTotal(data.total);
      setIndexingStatus(data.indexingStatus);
    } catch (e) {
      setResults([]);
      setTotal(0);
      setError((e as Error).message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateQuery = useCallback((q: string) => {
    setQuery(q);
    setPage(1);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(q, 1), 300);
  }, [doSearch]);

  const goToPage = useCallback((p: number) => {
    setPage(p);
    doSearch(query, p);
  }, [query, doSearch]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return { query, updateQuery, results, total, loading, error, indexingStatus, page, totalPages, goToPage };
}
