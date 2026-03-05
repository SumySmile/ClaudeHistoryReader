import { Router } from 'express';
import { getDb } from '../db/connection.js';
import { parseSession, parseSubagents } from '../services/parser.js';
import { exportSession } from '../services/exporter.js';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SessionRow {
  id: string;
  project_slug: string;
  project_path: string | null;
  summary: string | null;
  first_prompt: string | null;
  message_count: number;
  git_branch: string | null;
  model: string | null;
  created_at: string | null;
  modified_at: string | null;
  file_path: string;
  file_mtime: number | null;
  total_input_tokens: number;
  total_output_tokens: number;
  tool_call_count: number;
  is_favorite: number;
  indexed_at: string | null;
  tags_str: string | null;
}

interface CountResult {
  total: number;
}

// GET /api/sessions - List sessions with pagination, filtering, sorting
router.get('/', (req, res) => {
  const db = getDb();
  const {
    page = '1',
    limit = '50',
    project,
    favorite,
    tag,
    sort = 'modified_at',
    order = 'desc',
    search,
    model,
    min_tokens,
    max_tokens,
  } = req.query as Record<string, string>;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const allowedSorts = ['modified_at', 'created_at', 'message_count', 'summary'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'modified_at';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  let whereClause = '1=1';
  const params: (string | number)[] = [];

  if (project) {
    whereClause += ' AND s.project_slug = ?';
    params.push(project);
  }
  if (favorite === '1') {
    whereClause += ' AND s.is_favorite = 1';
  }
  if (tag) {
    whereClause += ' AND EXISTS (SELECT 1 FROM session_tags st JOIN tags t ON st.tag_id = t.id WHERE st.session_id = s.id AND t.name = ?)';
    params.push(tag);
  }
  if (search) {
    whereClause += ' AND (s.summary LIKE ? OR s.first_prompt LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (model) {
    whereClause += ' AND s.model = ?';
    params.push(model);
  }
  if (min_tokens) {
    const minTok = parseInt(min_tokens);
    if (!isNaN(minTok)) {
      whereClause += ' AND (s.total_input_tokens + s.total_output_tokens) >= ?';
      params.push(minTok);
    }
  }
  if (max_tokens) {
    const maxTok = parseInt(max_tokens);
    if (!isNaN(maxTok)) {
      whereClause += ' AND (s.total_input_tokens + s.total_output_tokens) <= ?';
      params.push(maxTok);
    }
  }

  const countSql = `SELECT COUNT(*) as total FROM sessions s WHERE ${whereClause}`;
  const total = (db.prepare(countSql).get(...params) as CountResult).total;

  const sql = `
    SELECT s.*,
      (SELECT GROUP_CONCAT(t.name || ':' || t.color, '|')
       FROM session_tags st JOIN tags t ON st.tag_id = t.id
       WHERE st.session_id = s.id) as tags_str
    FROM sessions s
    WHERE ${whereClause}
    ORDER BY ${sortCol} ${sortOrder}
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(sql).all(...params, limitNum, offset) as SessionRow[];

  const sessions = rows.map(row => ({
    ...row,
    tags: row.tags_str
      ? row.tags_str.split('|').map((t: string) => {
          const [name, color] = t.split(':');
          return { name, color };
        })
      : [],
    tags_str: undefined,
  }));

  res.json({
    sessions,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// GET /api/sessions/:id/messages - Get full conversation
router.get('/:id/messages', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });
  try {
    const db = getDb();
    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(req.params.id) as SessionRow | undefined;
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const messages = await parseSession(session.file_path);
    const subagents = await parseSubagents(session.file_path);

    // Update message count and model if not set
    if (messages.length > 0) {
      const model = messages.find(m => m.model)?.model;
      const totalInput = messages.reduce((sum, m) => sum + m.input_tokens, 0);
      const totalOutput = messages.reduce((sum, m) => sum + m.output_tokens, 0);
      const toolCalls = messages.reduce((sum, m) =>
        sum + m.content.filter(c => c.type === 'tool_use').length, 0);

      db.prepare(`UPDATE sessions SET message_count = ?, model = COALESCE(?, model),
        total_input_tokens = ?, total_output_tokens = ?, tool_call_count = ? WHERE id = ?`)
        .run(messages.length, model, totalInput, totalOutput, toolCalls, session.id);
    }

    const subagentData: Record<string, unknown[]> = {};
    for (const [agentId, msgs] of subagents) {
      subagentData[agentId] = msgs;
    }

    res.json({
      session,
      messages,
      subagents: subagentData,
    });
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// PATCH /api/sessions/:id/favorite - Toggle favorite
router.patch('/:id/favorite', (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });
  const db = getDb();
  const session = db.prepare('SELECT is_favorite FROM sessions WHERE id = ?').get(req.params.id) as Pick<SessionRow, 'is_favorite'> | undefined;
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const newValue = session.is_favorite ? 0 : 1;
  db.prepare('UPDATE sessions SET is_favorite = ? WHERE id = ?').run(newValue, req.params.id);
  res.json({ is_favorite: newValue });
});

// GET /api/sessions/:id/export - Export session
router.get('/:id/export', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) return res.status(400).json({ error: 'Invalid session ID' });
  try {
    const format = (req.query.format as string) === 'json' ? 'json' : 'md';
    const content = await exportSession(req.params.id, format);

    const db = getDb();
    const session = db.prepare('SELECT summary FROM sessions WHERE id = ?').get(req.params.id) as Pick<SessionRow, 'summary'> | undefined;
    const filename = `${(session?.summary || req.params.id).replace(/[^a-zA-Z0-9\u4e00-\u9fff\-_]/g, '_').slice(0, 50)}.${format === 'json' ? 'json' : 'md'}`;

    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(content);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
});

export default router;
