const BASE = '/api';
const LOCAL_TITLE_KEY = 'chv_custom_titles_v1';

function readLocalTitles(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LOCAL_TITLE_KEY);
    return raw ? JSON.parse(raw) as Record<string, string> : {};
  } catch {
    return {};
  }
}

function writeLocalTitles(map: Record<string, string>): void {
  try {
    localStorage.setItem(LOCAL_TITLE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getLocalCustomTitle(sessionId: string): string | null {
  const map = readLocalTitles();
  return map[sessionId] || null;
}

function setLocalCustomTitle(sessionId: string, title: string): void {
  const map = readLocalTitles();
  if (title.trim()) {
    map[sessionId] = title.trim();
  } else {
    delete map[sessionId];
  }
  writeLocalTitles(map);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export interface Session {
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
  total_input_tokens: number;
  total_output_tokens: number;
  tool_call_count: number;
  is_favorite: number;
  custom_title?: string | null;
  tags: { name: string; color: string }[];
}

export interface PaginatedSessions {
  sessions: Session[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ToolUseResultData {
  questions: {
    question: string;
    header?: string;
    options: { label: string; description?: string }[];
    multiSelect?: boolean;
  }[];
  answers: Record<string, string>;
  annotations?: Record<string, { notes?: string }>;
}

export interface MessageContent {
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result' | 'image' | 'error';
  text?: string;
  thinking?: string;
  summary?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
  tool_name?: string;
  toolUseResult?: ToolUseResultData;
  source?: unknown;
  error?: string;
}

export interface Message {
  uuid: string;
  role: 'user' | 'assistant' | 'system';
  type: string;
  content: MessageContent[];
  timestamp: string | null;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
}

export interface SessionDetail {
  session: Session;
  messages: Message[];
  subagents: Record<string, Message[]>;
}

export interface SearchResult {
  session_id: string;
  message_uuid: string;
  role: string;
  snippet: string;
  timestamp: string;
  summary: string | null;
  project_slug: string;
  first_prompt: string | null;
}

export interface Tag {
  id: number;
  name: string;
  color: string;
  session_count: number;
}

export interface Project {
  project_slug: string;
  project_path: string | null;
  session_count: number;
  last_activity: string | null;
  total_messages: number;
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
}

export interface IndexingStatus {
  isIndexing: boolean;
  indexed: number;
  total: number;
}

// Sessions
export const getSessions = (params: Record<string, string> = {}) => {
  const qs = new URLSearchParams(params).toString();
  return fetchJson<PaginatedSessions>(`/sessions?${qs}`);
};

export const getSessionMessages = (id: string) =>
  fetchJson<SessionDetail>(`/sessions/${id}/messages`);

export const toggleFavorite = (id: string) =>
  fetchJson<{ is_favorite: number }>(`/sessions/${id}/favorite`, { method: 'PATCH' });

export const updateSessionTitle = (id: string, title: string) =>
  fetchJson<{ title: string }>(`/sessions/${id}/title`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  }).catch(async (_err) => {
    // Compatibility fallback for environments/proxies that reject PATCH.
    try {
      return await fetchJson<{ title: string }>(`/sessions/${id}/title`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
    } catch {
      // Last-resort fallback: keep title editable even if backend route is stale.
      setLocalCustomTitle(id, title);
      return { title: title.trim() || 'Untitled' };
    }
  });

export const exportSession = (id: string, format: 'md' | 'json') =>
  `${BASE}/sessions/${id}/export?format=${format}`;

// Search
export const search = (q: string, limit = 50, offset = 0) =>
  fetchJson<{ results: SearchResult[]; total: number; indexingStatus: IndexingStatus }>(
    `/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`
  );

// Tags
export const getTags = () => fetchJson<Tag[]>('/tags');

export const createTag = (name: string, color: string) =>
  fetchJson<Tag>('/tags', {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });

export const deleteTag = (id: number) =>
  fetchJson<void>(`/tags/${id}`, { method: 'DELETE' });

export const addTagToSession = (sessionId: string, tagId: number) =>
  fetchJson<void>(`/tags/sessions/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ tag_id: tagId }),
  });

export const removeTagFromSession = (sessionId: string, tagId: number) =>
  fetchJson<void>(`/tags/sessions/${sessionId}/${tagId}`, { method: 'DELETE' });

// Projects
export const getProjects = () => fetchJson<Project[]>('/projects');

// Stats
export const getStats = () => fetchJson<StatsData>('/stats');

// Models
export const getModels = () => fetchJson<{ model: string; count: number }[]>('/models');

// Indexing
export const getIndexingStatus = () => fetchJson<IndexingStatus>('/indexing-status');
