import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { getIndexingStatus } from '../services/indexer.js';

const router = Router();

// GET /api/search?q=...
router.get('/', (req, res) => {
  const db = getDb();
  const { q, limit = '50', offset = '0' } = req.query as Record<string, string>;

  if (!q || q.trim().length === 0) {
    return res.json({ results: [], total: 0, indexingStatus: getIndexingStatus() });
  }

  // Escape FTS5 special characters and build query
  const ftsQuery = q.replace(/['"*]/g, ' ').trim().split(/\s+/).map(t => `"${t}"`).join(' ');

  try {
    const results = db.prepare(`
      SELECT
        f.session_id,
        f.message_uuid,
        f.role,
        snippet(messages_fts, 3, '<mark>', '</mark>', '...', 40) as snippet,
        f.timestamp,
        s.summary,
        s.project_slug,
        s.first_prompt
      FROM messages_fts f
      JOIN sessions s ON f.session_id = s.id
      WHERE messages_fts MATCH ?
      ORDER BY rank
      LIMIT ? OFFSET ?
    `).all(ftsQuery, parseInt(limit), parseInt(offset)) as any[];

    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM messages_fts WHERE messages_fts MATCH ?
    `).get(ftsQuery) as any;

    res.json({
      results,
      total: countResult?.total || 0,
      indexingStatus: getIndexingStatus(),
    });
  } catch (e: any) {
    // FTS query syntax error
    res.json({ results: [], total: 0, error: e.message, indexingStatus: getIndexingStatus() });
  }
});

export default router;
