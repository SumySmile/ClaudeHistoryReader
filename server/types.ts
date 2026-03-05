export interface SessionRecord {
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
  custom_title: string | null;
}

export interface TagRecord {
  id: number;
  name: string;
  color: string;
}

export interface SessionTagRecord {
  session_id: string;
  tag_id: number;
}

export interface ParsedMessage {
  uuid: string;
  role: 'user' | 'assistant' | 'system';
  type: string;
  content: MessageContent[];
  timestamp: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  duration_ms: number | null;
}

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'thinking'; thinking: string; summary?: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  | { type: 'image'; source: unknown }
  | { type: 'error'; error: string };

export interface SessionIndexEntry {
  sessionId: string;
  summary?: string;
  messageCount?: number;
  created?: string;
  lastModified?: string;
  model?: string;
  gitBranch?: string;
}

export interface StatsData {
  totalSessions: number;
  totalMessages: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalToolCalls: number;
  avgTokensPerSession: number;
  projectCount: number;
  dailyActivity: { date: string; sessions: number; messages: number }[];
  modelUsage: { model: string; count: number }[];
  projectDistribution: { project: string; sessions: number }[];
  topToolCalls: { tool: string; count: number }[];
}
