import { parseSession } from './parser.js';
import type { ParsedMessage, MessageContent } from '../types.js';
import { getDb } from '../db/connection.js';

export async function exportSession(sessionId: string, format: 'md' | 'json'): Promise<string> {
  const db = getDb();
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as any;
  if (!session) throw new Error('Session not found');

  const messages = await parseSession(session.file_path);

  if (format === 'json') {
    return JSON.stringify({ session, messages }, null, 2);
  }

  return exportAsMarkdown(session, messages);
}

function exportAsMarkdown(session: any, messages: ParsedMessage[]): string {
  const lines: string[] = [];
  lines.push(`# ${session.summary || 'Untitled Conversation'}`);
  lines.push('');
  lines.push(`- **Project**: ${session.project_slug}`);
  lines.push(`- **Date**: ${session.created_at || 'Unknown'}`);
  lines.push(`- **Messages**: ${messages.length}`);
  if (session.model) lines.push(`- **Model**: ${session.model}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of messages) {
    if (msg.role === 'user') {
      lines.push('## 🧑 User');
      lines.push('');
      for (const block of msg.content) {
        if (block.type === 'text') {
          lines.push(block.text);
        } else if (block.type === 'tool_result') {
          lines.push(`<details><summary>Tool Result (${block.tool_use_id})</summary>`);
          lines.push('');
          lines.push('```');
          lines.push(block.content.slice(0, 5000));
          lines.push('```');
          lines.push('</details>');
        }
        lines.push('');
      }
    } else if (msg.role === 'assistant') {
      lines.push('## 🤖 Assistant');
      if (msg.model) lines.push(`*Model: ${msg.model}*`);
      lines.push('');
      for (const block of msg.content) {
        if (block.type === 'text') {
          lines.push(block.text);
        } else if (block.type === 'thinking') {
          lines.push('<details><summary>💭 Thinking</summary>');
          lines.push('');
          lines.push(block.thinking.slice(0, 10000));
          lines.push('</details>');
        } else if (block.type === 'tool_use') {
          lines.push(`**🔧 Tool: ${block.name}**`);
          lines.push('```json');
          lines.push(JSON.stringify(block.input, null, 2).slice(0, 3000));
          lines.push('```');
        }
        lines.push('');
      }
    }
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
