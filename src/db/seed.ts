import Database from 'better-sqlite3';
import { mockDocuments } from './seed-data';
import { DEFAULT_USER_ID } from './migrate';

export function seedDatabase(sqlite: Database.Database) {
  const count = sqlite.prepare('SELECT count(*) as c FROM documents').get() as {
    c: number;
  };
  if (count.c > 0) return; // Already seeded

  const insertDoc = sqlite.prepare(
    'INSERT INTO documents (id, user_id, title, emoji, cover_image, tags, last_accessed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  const insertBlock = sqlite.prepare(
    'INSERT INTO blocks (id, document_id, type, position, parent_id, content, attributes, created_at, updated_at, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );

  const now = Date.now();

  const seed = sqlite.transaction(() => {
    for (const doc of mockDocuments) {
      insertDoc.run(
        doc.id,
        DEFAULT_USER_ID,
        doc.title,
        doc.emoji ?? null,
        doc.coverImage ?? null,
        JSON.stringify(doc.tags),
        doc.lastAccessedAt,
      );

      for (let i = 0; i < doc.blocks.length; i++) {
        const block = doc.blocks[i];
        insertBlock.run(
          block.id,
          doc.id,
          block.type,
          i,
          block.parentId ?? null,
          block.content ?? null,
          block.attributes ? JSON.stringify(block.attributes) : null,
          block.metadata?.createdAt ?? now,
          block.metadata?.updatedAt ?? now,
          block.metadata?.authorId ?? null,
        );
      }
    }
  });

  seed();
  console.log('[DB] Seed data inserted successfully.');
}
