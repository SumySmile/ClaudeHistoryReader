import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { PROJECTS_DIR } from '../config.js';
import { scanAllProjects } from './scanner.js';
import { reindexSession } from './indexer.js';
import { getDb } from '../db/connection.js';

type ChangeListener = (type: string, sessionId?: string) => void;
const listeners: ChangeListener[] = [];

export function onFileChange(listener: ChangeListener): void {
  listeners.push(listener);
}

function notifyListeners(type: string, sessionId?: string): void {
  for (const listener of listeners) {
    listener(type, sessionId);
  }
}

export function startWatcher(): void {
  if (!fs.existsSync(PROJECTS_DIR)) {
    console.warn('[watcher] Projects dir not found:', PROJECTS_DIR);
    return;
  }

  const watcher = chokidar.watch(PROJECTS_DIR, {
    ignoreInitial: true,
    depth: 3,
    ignored: [/node_modules/, /\.git/],
    awaitWriteFinish: { stabilityThreshold: 2000, pollInterval: 500 },
  });

  watcher.on('add', (filePath) => handleFileChange(filePath, 'add'));
  watcher.on('change', (filePath) => handleFileChange(filePath, 'change'));

  console.log('[watcher] Watching for changes in', PROJECTS_DIR);
}

async function handleFileChange(filePath: string, event: string): Promise<void> {
  const basename = path.basename(filePath);

  if (basename === 'sessions-index.json') {
    console.log(`[watcher] Index changed: ${filePath}`);
    await scanAllProjects();
    notifyListeners('scan-complete');
    return;
  }

  if (basename.endsWith('.jsonl')) {
    const sessionId = basename.replace('.jsonl', '');
    console.log(`[watcher] Session ${event}: ${sessionId}`);

    // Update mtime in DB
    const db = getDb();
    try {
      const stat = fs.statSync(filePath);
      db.prepare('UPDATE sessions SET file_mtime = ?, modified_at = ? WHERE id = ?')
        .run(stat.mtimeMs, new Date(stat.mtimeMs).toISOString(), sessionId);
    } catch (e) {
      console.warn('[watcher] stat failed', filePath, ':', (e as Error).message);
    }

    // Re-scan to pick up new sessions
    await scanAllProjects();

    // Re-index if it was already indexed
    const session = db.prepare('SELECT indexed_at FROM sessions WHERE id = ?').get(sessionId) as any;
    if (session?.indexed_at) {
      await reindexSession(sessionId, filePath);
    }

    notifyListeners('session-updated', sessionId);
  }
}
