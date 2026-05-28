import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  emoji: text('emoji'),
  coverImage: text('cover_image'),
  tags: text('tags'), // JSON string[]
  lastAccessedAt: integer('last_accessed_at').notNull(),
});

export const blocks = sqliteTable('blocks', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  position: integer('position').notNull(),
  parentId: text('parent_id'),
  content: text('content'),
  attributes: text('attributes'), // JSON string
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  authorId: text('author_id'),
});

export const blockEmbeddings = sqliteTable('block_embeddings', {
  blockId: text('block_id')
    .primaryKey()
    .references(() => blocks.id, { onDelete: 'cascade' }),
  embedding: blob('embedding', { mode: 'buffer' }).notNull(), // Float32Array → Buffer
  updatedAt: integer('updated_at').notNull(),
});
