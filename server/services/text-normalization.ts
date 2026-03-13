const INTERRUPTED_PLACEHOLDER_RE = /^\[\s*Request interrupted by user(?:\s+for tool use)?\s*\]$/i;
const COMMAND_WRAPPER_RE = /<\/?command-(?:message|name|args)>/i;
const COMMAND_MESSAGE_BLOCK_RE = /<command-message>([\s\S]*?)<\/command-message>/i;
const COMMAND_NAME_BLOCK_RE = /<command-name>([\s\S]*?)<\/command-name>/i;
const COMMAND_ARGS_BLOCK_RE = /<command-args>([\s\S]*?)<\/command-args>/i;
const LOCAL_COMMAND_RE = /<local-command-(?:caveat|stdout|stderr)>[\s\S]*?<\/local-command-(?:caveat|stdout|stderr)>/gi;
const SYSTEM_REMINDER_RE = /<system-reminder>[\s\S]*?<\/system-reminder>/gi;

function decodeEscapedWhitespace(input: string): string {
  return input
    .replace(/\\\\r\\\\n/g, '\n')
    .replace(/\\\\n/g, '\n')
    .replace(/\\\\t/g, '\t')
    .replace(/\\\\r/g, '\r')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r');
}

function unwrapCommandWrappers(input: string): string {
  return input
    .replace(/<command-message>/gi, '')
    .replace(/<\/command-message>/gi, '')
    .replace(/<command-name>/gi, '')
    .replace(/<\/command-name>/gi, '\n')
    .replace(/<command-args>/gi, '')
    .replace(/<\/command-args>/gi, '');
}

function simplifyCommandArg(arg: string): string {
  const trimmed = arg.trim();
  if (!trimmed) return '';

  // URL -> keep last path segment for readability
  try {
    const u = new URL(trimmed);
    const last = u.pathname.split('/').filter(Boolean).pop();
    return last || u.hostname;
  } catch {
    // Not a URL
  }

  // Local/remote path -> keep basename
  const normalized = trimmed.replace(/\\/g, '/');
  const base = normalized.split('/').filter(Boolean).pop();
  return (base || trimmed).slice(0, 80);
}

function extractCommandInvocation(input: string): string | null {
  const msg = input.match(COMMAND_MESSAGE_BLOCK_RE)?.[1]?.trim() || '';
  const name = input.match(COMMAND_NAME_BLOCK_RE)?.[1]?.trim() || '';
  const args = input.match(COMMAND_ARGS_BLOCK_RE)?.[1]?.trim() || '';
  const command = (name || msg).trim();
  if (!command) return null;
  const shortArg = simplifyCommandArg(args);
  return shortArg ? `${command} ${shortArg}` : command;
}

function extractTextFromJsonArray(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('[')) return null;
  try {
    const arr = JSON.parse(trimmed);
    if (!Array.isArray(arr)) return null;
    const text = arr
      .filter((b: any) => b?.type === 'text' && typeof b?.text === 'string')
      .map((b: any) => b.text.trim())
      .filter(Boolean)
      .join('\n')
      .trim();
    return text || null;
  } catch {
    return null;
  }
}

export function isInterruptedPlaceholder(input: string): boolean {
  return INTERRUPTED_PLACEHOLDER_RE.test(input.trim());
}

export function normalizeMessageText(raw: string | null | undefined): string {
  if (!raw) return '';
  let text = decodeEscapedWhitespace(raw).trim();

  // Strip system-reminder tags (injected into tool results)
  text = text.replace(SYSTEM_REMINDER_RE, '').trim();

  // Strip local-command tags (system noise from local command execution)
  text = text.replace(LOCAL_COMMAND_RE, '').trim();

  if (COMMAND_WRAPPER_RE.test(text)) {
    const invocation = extractCommandInvocation(text);
    if (invocation) {
      // Keep interrupted placeholders - they're meaningful context
      return invocation;
    }
    text = unwrapCommandWrappers(text).trim();
  }
  return text;
}

export function sanitizeConversationText(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const extracted = extractTextFromJsonArray(raw) ?? raw;
  const normalized = normalizeMessageText(extracted);
  if (!normalized) return null;
  // For titles, filter out interrupted placeholders (not useful as a title)
  if (isInterruptedPlaceholder(normalized)) return null;
  const singleLine = normalized.replace(/\s+/g, ' ').trim();
  return singleLine || null;
}
