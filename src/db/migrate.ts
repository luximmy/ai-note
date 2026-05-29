import Database from 'better-sqlite3';

export const DEFAULT_USER_ID = 'user_default';

export function migrateDatabase(sqlite: Database.Database) {
  // 1. Create users table if not exists
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  // 2. Check if documents table has user_id column
  const columns = sqlite
    .prepare("PRAGMA table_info('documents')")
    .all() as { name: string }[];
  const hasUserId = columns.some((c) => c.name === 'user_id');

  if (!hasUserId) {
    // 3. Create default user for existing data
    const now = Date.now();
    sqlite
      .prepare(
        'INSERT OR IGNORE INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        DEFAULT_USER_ID,
        'admin@ai-note.local',
        'MIGRATION_PLACEHOLDER',
        '默认用户',
        now,
        now
      );

    // 4. Add user_id column and backfill
    sqlite.exec('ALTER TABLE documents ADD COLUMN user_id TEXT');
    sqlite
      .prepare('UPDATE documents SET user_id = ?')
      .run(DEFAULT_USER_ID);
  }
}
