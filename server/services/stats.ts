import fs from 'fs';
import { STATS_CACHE_PATH } from '../config.js';
import { getDb } from '../db/connection.js';
import type { StatsData } from '../types.js';

// In-memory cache with TTL (5 minutes)
let memCache: { data: StatsData; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidateStatsCache(): void {
  memCache = null;
}

export function getStats(): StatsData {
  if (memCache && Date.now() < memCache.expiresAt) {
    return memCache.data;
  }

  const db = getDb();
  const cachedStats = readStatsCache();

  // From DB
  const totalSessions = (db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number }).c;

  const projectDistribution = db.prepare(
    'SELECT project_slug as project, COUNT(*) as sessions FROM sessions GROUP BY project_slug ORDER BY sessions DESC LIMIT 20'
  ).all() as { project: string; sessions: number }[];

  // totalToolCalls from DB
  const totalToolCalls = (db.prepare('SELECT COALESCE(SUM(tool_call_count), 0) as c FROM sessions').get() as { c: number }).c;

  // avgTokensPerSession
  const avgRes = db.prepare(
    'SELECT AVG(total_input_tokens + total_output_tokens) as avg FROM sessions WHERE total_input_tokens > 0'
  ).get() as { avg: number | null };
  const avgTokensPerSession = Math.round(avgRes.avg || 0);

  // From stats-cache.json
  const dailyActivity = (cachedStats?.dailyActivity || []).map((d: any) => ({
    date: d.date,
    sessions: d.sessionCount || 0,
    messages: d.messageCount || 0,
  }));

  // Model usage from stats-cache
  const modelUsage: { model: string; count: number }[] = [];
  if (cachedStats?.dailyModelTokens) {
    const modelTotals: Record<string, number> = {};
    for (const day of cachedStats.dailyModelTokens) {
      for (const [model, tokens] of Object.entries(day.tokensByModel || {})) {
        modelTotals[model] = (modelTotals[model] || 0) + (tokens as number);
      }
    }
    for (const [model, count] of Object.entries(modelTotals)) {
      modelUsage.push({ model, count });
    }
    modelUsage.sort((a, b) => b.count - a.count);
  }

  const totalMessages = cachedStats?.totalMessages || 0;
  const totalInputTokens = sumModelField(cachedStats, 'inputTokens');
  const totalOutputTokens = sumModelField(cachedStats, 'outputTokens');

  const data: StatsData = {
    totalSessions,
    totalMessages,
    totalInputTokens,
    totalOutputTokens,
    totalToolCalls,
    avgTokensPerSession,
    projectCount: projectDistribution.length,
    dailyActivity,
    modelUsage,
    projectDistribution,
    topToolCalls: [],
  };

  memCache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

function readStatsCache(): any {
  try {
    if (fs.existsSync(STATS_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(STATS_CACHE_PATH, 'utf-8'));
    }
  } catch (e) {
    console.warn('[stats] Cache read failed:', (e as Error).message);
  }
  return null;
}

function sumModelField(stats: any, field: string): number {
  if (!stats) return 0;
  let total = 0;
  for (const key of Object.keys(stats)) {
    if (typeof stats[key] === 'object' && stats[key] !== null && field in stats[key]) {
      total += stats[key][field] || 0;
    }
  }
  return total;
}
