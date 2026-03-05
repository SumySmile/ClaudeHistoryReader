import Database from 'better-sqlite3';
import { DB_PATH } from '../config.js';
import { initSchema } from './schema.js';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('cache_size = -32000');
    db.pragma('temp_store = MEMORY');
    db.pragma('synchronous = NORMAL');
    initSchema(db);
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
