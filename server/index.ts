import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';
import { getDb } from './db/connection.js';
import { scanAllProjects } from './services/scanner.js';
import { buildIndex, getIndexingStatus } from './services/indexer.js';
import { startWatcher, onFileChange } from './services/watcher.js';
import sessionsRouter from './routes/sessions.js';
import searchRouter from './routes/search.js';
import tagsRouter from './routes/tags.js';
import projectsRouter from './routes/projects.js';
import statsRouter from './routes/stats.js';

const app = express();
app.use(cors());
app.use(express.json());

// SSE clients for real-time updates
const sseClients: Set<express.Response> = new Set();

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

function broadcastEvent(event: string, data?: any) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`;
  for (const client of sseClients) {
    client.write(msg);
  }
}

// Routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/search', searchRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/stats', statsRouter);

// Indexing status endpoint
app.get('/api/indexing-status', (_req, res) => {
  res.json(getIndexingStatus());
});

// Models list endpoint
app.get('/api/models', (_req, res) => {
  const db = getDb();
  const models = db.prepare(
    'SELECT model, COUNT(*) as count FROM sessions WHERE model IS NOT NULL GROUP BY model ORDER BY count DESC'
  ).all() as { model: string; count: number }[];
  res.json(models);
});

// File change notifications
onFileChange((type, sessionId) => {
  broadcastEvent('update', { type, sessionId });
});

// Startup
async function start() {
  // Initialize DB
  const db = getDb();
  console.log('[startup] Database initialized');

  // Clean up raw JSON in existing first_prompt values
  const rawRows = db.prepare(
    `SELECT id, first_prompt FROM sessions WHERE first_prompt LIKE '[%'`
  ).all() as { id: string; first_prompt: string }[];
  if (rawRows.length > 0) {
    const update = db.prepare('UPDATE sessions SET first_prompt = ? WHERE id = ?');
    for (const row of rawRows) {
      try {
        const arr = JSON.parse(row.first_prompt);
        if (Array.isArray(arr)) {
          const text = arr
            .filter((b: any) => b.type === 'text' && b.text)
            .map((b: any) => b.text)
            .join(' ')
            .trim();
          update.run(text || null, row.id);
        }
      } catch {}
    }
    console.log(`[startup] Cleaned ${rawRows.length} first_prompt values`);
  }

  // Clean noisy first_prompt values (XML tags and bracket-wrapped noise)
  const noisyPrompts = db.prepare(
    `SELECT id, first_prompt FROM sessions WHERE first_prompt IS NOT NULL AND (first_prompt LIKE '[%]' OR first_prompt LIKE '%<%>%')`
  ).all() as { id: string; first_prompt: string }[];
  if (noisyPrompts.length > 0) {
    const updatePrompt = db.prepare('UPDATE sessions SET first_prompt = ? WHERE id = ?');
    for (const row of noisyPrompts) {
      const cleaned = row.first_prompt.replace(/<[^>]+>/g, '').trim();
      const final = /^\[.*\]$/.test(cleaned) ? null : (cleaned || null);
      updatePrompt.run(final, row.id);
    }
    console.log(`[startup] Cleaned ${noisyPrompts.length} noisy first_prompt values`);
  }

  // Clean noisy summaries (interrupted sessions, XML tags)
  const noisySummaries = db.prepare(
    `SELECT id, summary FROM sessions WHERE summary IS NOT NULL AND (summary LIKE '[%]' OR summary LIKE '%<%>%')`
  ).all() as { id: string; summary: string }[];
  if (noisySummaries.length > 0) {
    const updateSummary = db.prepare('UPDATE sessions SET summary = ? WHERE id = ?');
    for (const row of noisySummaries) {
      const cleaned = row.summary.replace(/<[^>]+>/g, '').trim();
      const final = /^\[.*\]$/.test(cleaned) ? null : (cleaned || null);
      updateSummary.run(final, row.id);
    }
    console.log(`[startup] Cleaned ${noisySummaries.length} noisy summaries`);
  }

  // Scan all projects
  const count = await scanAllProjects();
  console.log(`[startup] Scanned ${count} sessions`);

  // Start file watcher
  startWatcher();

  // Start background indexing
  setTimeout(() => {
    buildIndex().catch(e => console.error('[startup] Indexing error:', e));
  }, 1000);

  app.listen(PORT, () => {
    console.log(`[startup] Server running at http://localhost:${PORT}`);
  });
}

start().catch(console.error);
