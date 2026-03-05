import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { PROJECTS_DIR } from '../config.js';
import { getDb } from '../db/connection.js';
import type { SessionIndexEntry } from '../types.js';

/** Extract plain text from content that may be a string or JSON array */
function cleanFirstPrompt(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let text = raw;
  // If it looks like a JSON array, parse and extract text
  if (text.startsWith('[')) {
    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr)) {
        text = arr
          .filter((b: any) => b.type === 'text' && b.text)
          .map((b: any) => b.text)
          .join(' ');
      }
    } catch {}
  }
  // Strip XML/HTML tags (e.g. <command-message>...</command-message>)
  text = text.replace(/<[^>]+>/g, '').trim();
  // Filter bracket-wrapped noise (e.g. [Request interrupted by user for tool use])
  if (/^\[.*\]$/.test(text)) return null;
  return text || null;
}

/** Clean summary: strip XML tags and filter known noise patterns */
function cleanSummary(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let text = raw.replace(/<[^>]+>/g, '').trim();
  // Filter bracket-wrapped noise (e.g. [Request interrupted by user for tool use])
  if (/^\[.*\]$/.test(text)) return null;
  return text || null;
}

export async function scanAllProjects(): Promise<number> {
  const db = getDb();
  let count = 0;

  if (!fs.existsSync(PROJECTS_DIR)) return 0;

  const projectDirs = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const upsert = db.prepare(`
    INSERT INTO sessions (id, project_slug, project_path, summary, first_prompt, message_count,
      git_branch, model, created_at, modified_at, file_path, file_mtime)
    VALUES (@id, @project_slug, @project_path, @summary, @first_prompt, @message_count,
      @git_branch, @model, @created_at, @modified_at, @file_path, @file_mtime)
    ON CONFLICT(id) DO UPDATE SET
      summary = COALESCE(@summary, summary),
      first_prompt = COALESCE(@first_prompt, first_prompt),
      message_count = MAX(COALESCE(@message_count, 0), COALESCE(message_count, 0)),
      git_branch = COALESCE(@git_branch, git_branch),
      model = COALESCE(@model, model),
      project_path = COALESCE(@project_path, project_path),
      modified_at = COALESCE(@modified_at, modified_at),
      file_mtime = COALESCE(@file_mtime, file_mtime)
  `);

  for (const slug of projectDirs) {
    const projectDir = path.join(PROJECTS_DIR, slug);
    const indexPath = path.join(projectDir, 'sessions-index.json');

    // Try sessions-index.json first
    if (fs.existsSync(indexPath)) {
      try {
        const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
        const entries: any[] = indexData.entries || [];
        for (const entry of entries) {
          if (entry.isSidechain) continue; // Skip subagent entries
          const filePath = entry.fullPath || path.join(projectDir, `${entry.sessionId}.jsonl`);
          upsert.run({
            id: entry.sessionId,
            project_slug: slug,
            project_path: entry.projectPath || null,
            summary: cleanSummary(entry.summary),
            first_prompt: cleanFirstPrompt(entry.firstPrompt)?.slice(0, 500) || null,
            message_count: entry.messageCount || 0,
            git_branch: entry.gitBranch || null,
            model: null,
            created_at: entry.created || null,
            modified_at: entry.modified || entry.lastModified || null,
            file_path: filePath,
            file_mtime: entry.fileMtime || null,
          });
          count++;
        }
      } catch (e) {
        console.error(`Failed to parse index for ${slug}:`, e);
      }
    }

    // Also scan for .jsonl files not in the index
    const jsonlFiles = fs.readdirSync(projectDir)
      .filter(f => f.endsWith('.jsonl'));

    for (const file of jsonlFiles) {
      const sessionId = path.basename(file, '.jsonl');
      // Check if already in DB
      const existing = db.prepare('SELECT file_mtime FROM sessions WHERE id = ?').get(sessionId) as any;
      const filePath = path.join(projectDir, file);
      const stat = fs.statSync(filePath);
      if (existing && existing.file_mtime >= stat.mtimeMs) continue;
      if (existing) continue; // Already indexed from sessions-index.json

      // Parse first few lines for metadata
      try {
        const meta = await parseFirstLines(filePath);
        upsert.run({
          id: sessionId,
          project_slug: slug,
          project_path: null,
          summary: null,
          first_prompt: meta.firstPrompt ? meta.firstPrompt.slice(0, 500) : null,
          message_count: 0,
          git_branch: meta.gitBranch || null,
          model: meta.model || null,
          created_at: meta.timestamp || null,
          modified_at: new Date(stat.mtimeMs).toISOString(),
          file_path: filePath,
          file_mtime: stat.mtimeMs,
        });
        count++;
      } catch (e) {
        console.warn('[scanner] Skip file', filePath, ':', (e as Error).message);
      }
    }
  }

  return count;
}

async function parseFirstLines(filePath: string): Promise<{
  firstPrompt?: string; gitBranch?: string; model?: string; timestamp?: string;
}> {
  return new Promise((resolve) => {
    const result: any = {};
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream });
    let lineCount = 0;

    rl.on('line', (line) => {
      lineCount++;
      if (lineCount > 20) { rl.close(); return; }
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'user' && !result.firstPrompt) {
          const content = obj.message?.content;
          if (typeof content === 'string') {
            result.firstPrompt = content;
          } else if (Array.isArray(content)) {
            result.firstPrompt = content
              .filter((b: any) => b.type === 'text' && b.text)
              .map((b: any) => b.text)
              .join(' ');
          }
          result.timestamp = obj.timestamp;
          result.gitBranch = obj.gitBranch;
        }
        if (obj.type === 'assistant' && !result.model) {
          result.model = obj.message?.model;
        }
      } catch (e) {
        console.debug('[scanner] Parse error:', (e as Error).message);
      }
    });

    rl.on('close', () => resolve(result));
    rl.on('error', () => resolve(result));
  });
}
