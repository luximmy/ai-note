import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
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

export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(), // JSON string of parts
  createdAt: integer('created_at').notNull(),
});
