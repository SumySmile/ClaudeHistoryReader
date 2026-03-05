import { useState, useEffect, useCallback } from 'react';
import * as api from '../lib/api';
import type { Tag } from '../lib/api';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getTags();
      setTags(data);
      setError(null);
    } catch (e) {
      setError((e as Error).message || 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (name: string, color: string) => {
    const tag = await api.createTag(name, color);
    setTags(prev => [...prev, { ...tag, session_count: 0 }]);
    return tag;
  }, []);

  const remove = useCallback(async (id: number) => {
    await api.deleteTag(id);
    setTags(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToSession = useCallback(async (sessionId: string, tagId: number) => {
    await api.addTagToSession(sessionId, tagId);
  }, []);

  const removeFromSession = useCallback(async (sessionId: string, tagId: number) => {
    await api.removeTagFromSession(sessionId, tagId);
  }, []);

  return { tags, loading, error, create, remove, addToSession, removeFromSession, reload: load };
}
