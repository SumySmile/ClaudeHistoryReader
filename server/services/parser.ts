import fs from 'fs';
import readline from 'readline';
import path from 'path';
import type { ParsedMessage, MessageContent } from '../types.js';
import { normalizeMessageText } from './text-normalization.js';

export async function parseSession(filePath: string): Promise<ParsedMessage[]> {
  if (!fs.existsSync(filePath)) return [];

  const messages: ParsedMessage[] = [];
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream });

  // Track assistant message chunks by API message id
  const assistantChunks = new Map<string, ParsedMessage>();

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);

      // Skip non-message types
      if (['file-history-snapshot', 'progress', 'summary'].includes(obj.type)) continue;

      if (obj.type === 'user') {
        const msg = parseUserMessage(obj);
        if (msg) messages.push(msg);
      } else if (obj.type === 'assistant') {
        const apiId = obj.message?.id;
        if (apiId && assistantChunks.has(apiId)) {
          // Merge content into existing message
          const existing = assistantChunks.get(apiId)!;
          const newContent = extractAssistantContent(obj.message?.content || []);
          existing.content.push(...newContent);
          // Update token counts (take the latest/largest)
          if (obj.message?.usage) {
            existing.input_tokens = Math.max(existing.input_tokens, obj.message.usage.input_tokens || 0);
            existing.output_tokens = Math.max(existing.output_tokens, obj.message.usage.output_tokens || 0);
          }
        } else {
          const msg = parseAssistantMessage(obj);
          if (msg) {
            messages.push(msg);
            if (apiId) assistantChunks.set(apiId, msg);
          }
        }
      } else if (obj.type === 'result') {
        // result messages contain final usage/cost info, skip for display
      }
    } catch {
      // Skip unparseable lines
    }
  }

  return messages;
}

function parseUserMessage(obj: any): ParsedMessage | null {
  const content = obj.message?.content;
  if (!content) return null;

  const messageContent: MessageContent[] = [];

  if (typeof content === 'string') {
    const normalized = normalizeMessageText(content);
    if (normalized) messageContent.push({ type: 'text', text: normalized });
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === 'tool_result') {
        const text = typeof block.content === 'string'
          ? block.content
          : Array.isArray(block.content)
            ? block.content.map((c: any) => c.text || '').join('\n')
            : JSON.stringify(block.content);
        const normalized = normalizeMessageText(text);
        if (!normalized) continue;
        messageContent.push({
          type: 'tool_result',
          tool_use_id: block.tool_use_id,
          content: normalized.slice(0, 10000), // Truncate very long results
          is_error: block.is_error,
        });
      } else if (block.type === 'text') {
        const normalized = normalizeMessageText(block.text);
        if (normalized) messageContent.push({ type: 'text', text: normalized });
      } else if (block.type === 'image') {
        messageContent.push({ type: 'image', source: block.source });
      }
    }
  }

  if (messageContent.length === 0) return null;

  return {
    uuid: obj.uuid,
    role: 'user',
    type: obj.type,
    content: messageContent,
    timestamp: obj.timestamp || null,
    model: null,
    input_tokens: 0,
    output_tokens: 0,
    duration_ms: null,
  };
}

function parseAssistantMessage(obj: any): ParsedMessage | null {
  const content = extractAssistantContent(obj.message?.content || []);
  if (content.length === 0) return null;

  return {
    uuid: obj.uuid,
    role: 'assistant',
    type: obj.type,
    content,
    timestamp: obj.timestamp || null,
    model: obj.message?.model || null,
    input_tokens: obj.message?.usage?.input_tokens || 0,
    output_tokens: obj.message?.usage?.output_tokens || 0,
    duration_ms: null,
  };
}

function extractAssistantContent(blocks: any[]): MessageContent[] {
  const result: MessageContent[] = [];
  for (const block of blocks) {
    if (block.type === 'text' && block.text) {
      const normalized = normalizeMessageText(block.text);
      if (normalized) result.push({ type: 'text', text: normalized });
    } else if (block.type === 'thinking' && block.thinking) {
      result.push({ type: 'thinking', thinking: block.thinking, summary: block.summary });
    } else if (block.type === 'tool_use') {
      result.push({
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: block.input,
      });
    }
  }
  return result;
}

export async function parseSubagents(sessionFilePath: string): Promise<Map<string, ParsedMessage[]>> {
  const sessionDir = sessionFilePath.replace('.jsonl', '');
  const subagentsDir = path.join(sessionDir, 'subagents');
  const result = new Map<string, ParsedMessage[]>();

  if (!fs.existsSync(subagentsDir)) return result;

  const files = fs.readdirSync(subagentsDir).filter(f => f.endsWith('.jsonl'));
  for (const file of files) {
    const agentId = file.replace('.jsonl', '');
    const messages = await parseSession(path.join(subagentsDir, file));
    result.set(agentId, messages);
  }

  return result;
}
