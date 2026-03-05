import fs from 'fs';
import readline from 'readline';
import { getDb } from '../db/connection.js';
import { PROJECTS_DIR } from '../config.js';

let isIndexing = false;

export function getIndexingStatus(): { isIndexing: boolean; indexed: number; total: number } {
  const db = getDb();
  const indexed = (db.prepare('SELECT COUNT(*) as c FROM sessions WHERE indexed_at IS NOT NULL').get() as any).c;
  const total = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as any).c;
  return { isIndexing, indexed, total };
}

export async function buildIndex(): Promise<void> {
  if (isIndexing) return;
  isIndexing = true;

  try {
    const db = getDb();
    const sessions = db.prepare(
      'SELECT id, file_path FROM sessions WHERE indexed_at IS NULL'
    ).all() as { id: string; file_path: string }[];

    console.log(`[indexer] ${sessions.length} sessions to index`);

    const insertFts = db.prepare(`
      INSERT INTO messages_fts (session_id, message_uuid, role, content, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const session of sessions) {
      try {
        await indexSession(session.id, session.file_path, insertFts);
        db.prepare('UPDATE sessions SET indexed_at = ? WHERE id = ?')
          .run(new Date().toISOString(), session.id);
      } catch (e) {
        console.error(`[indexer] Failed to index ${session.id}:`, e);
      }
    }
  } finally {
    isIndexing = false;
    console.log('[indexer] Indexing complete');
  }
}

async function indexSession(
  sessionId: string,
  filePath: string,
  insertStmt: any
): Promise<void> {
  if (!fs.existsSync(filePath)) return;

  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'user') {
        const content = obj.message?.content;
        const text = typeof content === 'string' ? content
          : Array.isArray(content)
            ? content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join(' ')
            : '';
        if (text.trim()) {
          insertStmt.run(sessionId, obj.uuid, 'user', text.slice(0, 50000), obj.timestamp);
        }
      } else if (obj.type === 'assistant') {
        const blocks = obj.message?.content || [];
        const texts = blocks
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join(' ');
        if (texts.trim()) {
          insertStmt.run(sessionId, obj.uuid, 'assistant', texts.slice(0, 50000), obj.timestamp);
        }
      }
    } catch (e) {
      console.debug('[indexer] Skip line', lineNum, ':', (e as Error).message);
    }
  }
}

export async function reindexSession(sessionId: string, filePath: string): Promise<void> {
  const db = getDb();
  // Remove old FTS entries
  db.prepare('DELETE FROM messages_fts WHERE session_id = ?').run(sessionId);
  db.prepare('UPDATE sessions SET indexed_at = NULL WHERE id = ?').run(sessionId);

  const insertFts = db.prepare(`
    INSERT INTO messages_fts (session_id, message_uuid, role, content, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `);

  await indexSession(sessionId, filePath, insertFts);
  db.prepare('UPDATE sessions SET indexed_at = ? WHERE id = ?')
    .run(new Date().toISOString(), sessionId);
}
