import express from 'express';
import cors from 'cors';
import { PORT } from './config.js';
import { getDb } from './db/connection.js';
import { scanAllProjects } from './services/scanner.js';
import { buildIndex, getIndexingStatus } from './services/indexer.js';
import { startWatcher, onFileChange } from './services/watcher.js';
import { sanitizeConversationText } from './services/text-normalization.js';
import { parseSession } from './services/parser.js';
import type { MessageContent } from './types.js';
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

function broadcastEvent(event: string, data?: unknown) {
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

async function runStartupPhase(name: string, task: () => Promise<void> | void) {
  try {
    await task();
  } catch (error) {
    console.error(`[startup] ${name} failed:`, error);
  }
}

function normalizeStoredText() {
  const db = getDb();

  const promptRows = db.prepare(
    `SELECT id, first_prompt FROM sessions WHERE first_prompt IS NOT NULL`
  ).all() as { id: string; first_prompt: string }[];
  if (promptRows.length > 0) {
    const updatePrompt = db.prepare('UPDATE sessions SET first_prompt = ? WHERE id = ?');
    let updated = 0;
    for (const row of promptRows) {
      const normalized = sanitizeConversationText(row.first_prompt);
      if ((normalized ?? null) !== row.first_prompt) {
        updatePrompt.run(normalized, row.id);
        updated++;
      }
    }
    if (updated > 0) {
      console.log(`[startup] Normalized ${updated} first_prompt values`);
    }
  }

  const summaryRows = db.prepare(
    `SELECT id, summary FROM sessions WHERE summary IS NOT NULL`
  ).all() as { id: string; summary: string }[];
  if (summaryRows.length > 0) {
    const updateSummary = db.prepare('UPDATE sessions SET summary = ? WHERE id = ?');
    let updated = 0;
    for (const row of summaryRows) {
      const normalized = sanitizeConversationText(row.summary);
      if ((normalized ?? null) !== row.summary) {
        updateSummary.run(normalized, row.id);
        updated++;
      }
    }
    if (updated > 0) {
      console.log(`[startup] Normalized ${updated} summaries`);
    }
  }
}

function isTextContent(content: MessageContent): content is Extract<MessageContent, { type: 'text' }> {
  return content.type === 'text';
}

async function backfillMissingTitles() {
  const db = getDb();
  const titleMissingRows = db.prepare(
    `SELECT id, file_path FROM sessions
     WHERE COALESCE(TRIM(summary), '') = ''
       AND COALESCE(TRIM(first_prompt), '') = ''
       AND file_path IS NOT NULL`
  ).all() as { id: string; file_path: string }[];

  if (titleMissingRows.length === 0) return;

  const updatePrompt = db.prepare('UPDATE sessions SET first_prompt = ? WHERE id = ?');
  let updated = 0;
  const interruptedRe = /^\[\s*Request interrupted by user(?: for tool use)?\s*\]$/i;

  for (const row of titleMissingRows) {
    try {
      const messages = await parseSession(row.file_path);
      const candidate = messages
        .filter(message => message.role === 'user')
        .flatMap(message => message.content)
        .filter(isTextContent)
        .map(content => sanitizeConversationText(content.text || ''))
        .find(text => text && !interruptedRe.test(text));

      if (candidate) {
        updatePrompt.run(candidate.slice(0, 500), row.id);
        updated++;
      }
    } catch (error) {
      console.error(`[startup] Title backfill skipped for ${row.file_path}:`, error);
    }
  }

  if (updated > 0) {
    console.log(`[startup] Backfilled ${updated} missing titles from message content`);
  }
}

async function runBackgroundStartup() {
  await runStartupPhase('Text normalization', () => {
    normalizeStoredText();
  });

  await runStartupPhase('Title backfill', async () => {
    await backfillMissingTitles();
  });

  await runStartupPhase('Project scan', async () => {
    const count = await scanAllProjects();
    console.log(`[startup] Scanned ${count} sessions`);
  });

  await runStartupPhase('Watcher startup', () => {
    startWatcher();
    console.log('[startup] File watcher started');
  });

  setTimeout(() => {
    void runStartupPhase('Background indexing', async () => {
      await buildIndex();
    });
  }, 1000);
}

async function listen() {
  await new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`[startup] Server running at http://localhost:${PORT}`);
      resolve();
    });

    server.on('error', reject);
  });
}

// Startup
async function start() {
  getDb();
  console.log('[startup] Database initialized');

  await listen();
  void runBackgroundStartup();
}

start().catch(error => {
  console.error('[startup] Fatal startup error:', error);
  process.exitCode = 1;
});
