import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'node:path';
import fs from 'node:fs';
import { migrateDatabase } from './migrate';

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
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
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
      CREATE TABLE IF NOT EXISTS block_embeddings (
        block_id TEXT PRIMARY KEY REFERENCES blocks(id) ON DELETE CASCADE,
        embedding BLOB NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // Run migrations for existing databases
    migrateDatabase(sqlite);

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
