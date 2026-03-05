import path from 'path';
import os from 'os';

export const CLAUDE_DIR = path.join(os.homedir(), '.claude');
export const PROJECTS_DIR = path.join(CLAUDE_DIR, 'projects');
export const STATS_CACHE_PATH = path.join(CLAUDE_DIR, 'stats-cache.json');
export const DB_PATH = path.join(CLAUDE_DIR, 'history-viewer.db');
export const PORT = 3847;
