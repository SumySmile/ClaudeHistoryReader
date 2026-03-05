import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

// GET /api/tags - List all tags with usage count
router.get('/', (_req, res) => {
  const db = getDb();
  const tags = db.prepare(`
    SELECT t.*, COUNT(st.session_id) as session_count
    FROM tags t
    LEFT JOIN session_tags st ON t.id = st.tag_id
    GROUP BY t.id
    ORDER BY t.name
  `).all();
  res.json(tags);
});

// POST /api/tags - Create tag
router.post('/', (req, res) => {
  const db = getDb();
  const { name, color = '#6366f1' } = req.body;
  const trimmedName = (name || '').trim().slice(0, 50);
  if (!trimmedName) return res.status(400).json({ error: 'Name required' });
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color))
    return res.status(400).json({ error: 'Invalid color format' });
  try {
    const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(trimmedName, color);
    res.json({ id: result.lastInsertRowid, name: trimmedName, color });
  } catch {
    res.status(409).json({ error: 'Tag already exists' });
  }
});

// DELETE /api/tags/:id
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM session_tags WHERE tag_id = ?').run(req.params.id);
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/sessions/:sessionId/tags - Add tag to session
router.post('/sessions/:sessionId', (req, res) => {
  const db = getDb();
  const { tag_id } = req.body;
  if (!tag_id) return res.status(400).json({ error: 'tag_id required' });
  try {
    db.prepare('INSERT OR IGNORE INTO session_tags (session_id, tag_id) VALUES (?, ?)')
      .run(req.params.sessionId, tag_id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/sessions/:sessionId/tags/:tagId - Remove tag from session
router.delete('/sessions/:sessionId/:tagId', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM session_tags WHERE session_id = ? AND tag_id = ?')
    .run(req.params.sessionId, req.params.tagId);
  res.json({ success: true });
});

export default router;
