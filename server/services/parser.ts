import fs from 'fs';
import readline from 'readline';
import path from 'path';
import type { ParsedMessage, MessageContent, ToolResultContent, ToolUseAnswerValue, ToolUseQuestion, ToolUseResultData } from '../types.js';
import { normalizeMessageText } from './text-normalization.js';

export async function parseSession(filePath: string): Promise<ParsedMessage[]> {
  if (!fs.existsSync(filePath)) return [];

  const messages: ParsedMessage[] = [];
  const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream });

  // Track assistant message chunks by API message id
  const assistantChunks = new Map<string, ParsedMessage>();
  // Track tool_use_id -> tool_name for tagging tool_results (e.g. AskUserQuestion answers)
  const toolUseNames = new Map<string, string>();

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);

      // Skip non-message types
      if (['file-history-snapshot', 'progress', 'summary'].includes(obj.type)) continue;

      if (obj.type === 'user') {
        const msg = parseUserMessage(obj, toolUseNames);
        if (msg) messages.push(msg);
      } else if (obj.type === 'assistant') {
        const apiId = obj.message?.id;
        if (apiId && assistantChunks.has(apiId)) {
          // Merge content into existing message
          const existing = assistantChunks.get(apiId)!;
          const newContent = extractAssistantContent(obj.message?.content || []);
          existing.content.push(...newContent);
          // Track tool_use names from merged chunks
          for (const block of newContent) {
            if (block.type === 'tool_use' && block.id) {
              toolUseNames.set(block.id, block.name);
            }
          }
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
            // Track tool_use names for tagging user tool_results
            for (const block of msg.content) {
              if (block.type === 'tool_use' && block.id) {
                toolUseNames.set(block.id, block.name);
              }
            }
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

function parseUserMessage(obj: any, toolUseNames?: Map<string, string>): ParsedMessage | null {
  const content = obj.message?.content;
  if (!content) return null;

  const messageContent: MessageContent[] = [];

  if (typeof content === 'string') {
    const normalized = normalizeMessageText(content);
    if (normalized) messageContent.push({ type: 'text', text: normalized });
  } else if (Array.isArray(content)) {
    for (const block of content) {
      if (block.type === 'tool_result') {
        const toolName = resolveToolName(block, obj, toolUseNames);
        const resultBlock: ToolResultContent = {
          type: 'tool_result',
          tool_use_id: block.tool_use_id,
          content: getNormalizedToolResultContent(block),
          is_error: block.is_error,
          ...(toolName ? { tool_name: toolName } : {}),
        };

        const toolUseResult = normalizeToolUseResultData(obj, block, toolName);
        if (toolUseResult) {
          resultBlock.toolUseResult = toolUseResult;
        }

        if (resultBlock.content || resultBlock.toolUseResult || resultBlock.tool_name) {
          messageContent.push(resultBlock);
        }
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

function resolveToolName(block: any, obj: any, toolUseNames?: Map<string, string>): string | undefined {
  const explicitName =
    block.tool_name
    || block.name
    || block.content?.find?.((item: any) => item?.type === 'tool_reference')?.tool_name
    || obj.toolUseResult?.tool_name
    || obj.toolUseResult?.toolName;

  if (typeof explicitName === 'string' && explicitName.trim()) {
    return explicitName;
  }

  const mapped = block.tool_use_id ? toolUseNames?.get(block.tool_use_id) : undefined;
  return typeof mapped === 'string' && mapped.trim() ? mapped : undefined;
}

function getNormalizedToolResultContent(block: any): string {
  const text = typeof block.content === 'string'
    ? block.content
    : Array.isArray(block.content)
      ? block.content
        .map((item: any) => {
          if (typeof item?.text === 'string') return item.text;
          if (item?.type === 'tool_reference' && typeof item.tool_name === 'string') {
            return `[Tool reference: ${item.tool_name}]`;
          }
          return JSON.stringify(item);
        })
        .filter(Boolean)
        .join('\n')
      : block.content == null
        ? ''
        : JSON.stringify(block.content);

  return normalizeMessageText(text)?.slice(0, 10000) || '';
}

function normalizeToolUseResultData(obj: any, block: any, toolName?: string): ToolUseResultData | undefined {
  const candidates = [
    obj.toolUseResult,
    block.toolUseResult,
    block.result,
    block.data,
    block.content,
  ];

  for (const candidate of candidates) {
    const normalized = toToolUseResultData(candidate);
    if (normalized) return normalized;
  }

  if (toolName === 'AskUserQuestion') {
    const parsed = extractAskUserQuestionAnswersFromContent(block.content);
    if (parsed) return parsed;
  }

  return undefined;
}

function toToolUseResultData(value: unknown): ToolUseResultData | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  const questions = normalizeQuestions(record.questions);
  const answers = normalizeAnswers(record.answers);
  const annotations = normalizeAnnotations(record.annotations);

  if (!questions || !answers) return undefined;

  return {
    questions,
    answers,
    ...(annotations ? { annotations } : {}),
  };
}

function normalizeQuestions(value: unknown): ToolUseQuestion[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const questions = value
    .map(question => {
      if (!question || typeof question !== 'object') return null;
      const record = question as Record<string, unknown>;
      if (typeof record.question !== 'string' || !record.question.trim()) return null;
      const options = Array.isArray(record.options)
        ? record.options
          .map(option => {
            if (!option || typeof option !== 'object') return null;
            const optionRecord = option as Record<string, unknown>;
            if (typeof optionRecord.label !== 'string' || !optionRecord.label.trim()) return null;
            return {
              label: optionRecord.label,
              ...(typeof optionRecord.description === 'string' && optionRecord.description.trim()
                ? { description: optionRecord.description }
                : {}),
            };
          })
          .filter((option): option is ToolUseQuestion['options'][number] => Boolean(option))
        : [];

      return {
        question: record.question,
        ...(typeof record.header === 'string' && record.header.trim() ? { header: record.header } : {}),
        options,
        ...(typeof record.multiSelect === 'boolean' ? { multiSelect: record.multiSelect } : {}),
      };
    })
    .filter((question): question is ToolUseQuestion => Boolean(question));

  return questions.length > 0 ? questions : undefined;
}

function normalizeAnswers(value: unknown): Record<string, ToolUseAnswerValue> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const result: Record<string, ToolUseAnswerValue> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const normalized = normalizeAnswerValue(rawValue);
    if (!normalized) continue;
    result[key] = normalized;
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function normalizeAnswerValue(value: unknown): ToolUseAnswerValue | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === 'string');
    return items.length > 0 ? items : undefined;
  }

  return undefined;
}

function normalizeAnnotations(value: unknown): ToolUseResultData['annotations'] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;

  const result: NonNullable<ToolUseResultData['annotations']> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) continue;
    const notes = (rawValue as Record<string, unknown>).notes;
    if (typeof notes !== 'string' || !notes.trim()) continue;
    result[key] = { notes };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}

function extractAskUserQuestionAnswersFromContent(content: unknown): ToolUseResultData | undefined {
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content)
      ? content.map((item: any) => item?.text).filter((item: unknown): item is string => typeof item === 'string').join('\n')
      : '';

  if (!text) return undefined;

  const marker = 'User has answered your questions:';
  const markerIndex = text.indexOf(marker);
  if (markerIndex === -1) return undefined;

  const body = text.slice(markerIndex + marker.length).replace(/You can now continue[\s\S]*$/i, '').trim();
  const answers: Record<string, string> = {};
  const pairRe = /"([^"]+)"\s*=\s*"([\s\S]*?)"(?=,\s*"[^"]+"\s*=|\.?\s*$)/g;
  let match: RegExpExecArray | null;

  while ((match = pairRe.exec(body))) {
    answers[match[1]] = match[2];
  }

  if (Object.keys(answers).length === 0) return undefined;

  return {
    questions: Object.keys(answers).map(question => ({ question, options: [] })),
    answers,
  };
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
