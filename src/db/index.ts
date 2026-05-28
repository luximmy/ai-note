import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'node:path';
import fs from 'node:fs';

// Use globalThis singleton to avoid multiple connections during Next.js build
const globalForDb = globalThis as unknown as {
  __aiNoteDb: ReturnType<typeof drizzle>;
  __aiNoteSqlite: Database.Database;
  __aiNoteSeeded: boolean;
};

function getDb() {
  if (!globalForDb.__aiNoteDb) {
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const sqlite = new Database(path.join(dbDir, 'ai-note.db'));
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('busy_timeout = 10000');

    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        emoji TEXT,
        cover_image TEXT,
        tags TEXT,
        last_accessed_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        position INTEGER NOT NULL,
        parent_id TEXT,
        content TEXT,
        attributes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        author_id TEXT
      );
    `);

    globalForDb.__aiNoteSqlite = sqlite;
    globalForDb.__aiNoteDb = drizzle(sqlite, { schema });
    globalForDb.__aiNoteSeeded = false;
  }
  return globalForDb.__aiNoteDb;
}

export const db = getDb();

export function ensureSeeded() {
  if (globalForDb.__aiNoteSeeded) return;
  const count = globalForDb.__aiNoteSqlite
    .prepare('SELECT count(*) as c FROM documents')
    .get() as { c: number };
  if (count.c === 0) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { seedDatabase } = require('./seed');
    seedDatabase(globalForDb.__aiNoteSqlite);
  }
  globalForDb.__aiNoteSeeded = true;
}
