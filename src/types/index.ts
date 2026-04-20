// src/types/index.ts

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'todo'
  | 'image'
  | 'generative_ui'
  | 'callout';

export interface BaseBlock {
  id: string;
  type: BlockType;
  parentId?: string;
  content?: string;
  metadata?: {
    createdAt: number;
    updatedAt: number;
    authorId?: string;
  };
}

export interface TextBlock extends BaseBlock {
  type: 'paragraph' | 'heading';
  attributes?: {
    level?: 1 | 2 | 3;
    textAlign?: 'left' | 'center' | 'right';
  };
}

export interface CodeBlock extends BaseBlock {
  type: 'code';
  attributes: {
    language: string;
    theme?: string;
    showLineNumbers?: boolean;
    isExecuting?: boolean;
  };
}

export interface TodoBlock extends BaseBlock {
  type: 'todo';
  attributes: {
    checked: boolean;
  };
}

export interface GenerativeUIBlock extends BaseBlock {
  type: 'generative_ui';
  attributes: {
    componentId: string;
    status: 'streaming' | 'completed' | 'error';
    props: Record<string, any>;
    rawResponse?: string;
  };
}

export type Block = TextBlock | CodeBlock | TodoBlock | GenerativeUIBlock;

export interface Document {
  id: string;
  title: string;
  emoji?: string;
  coverImage?: string;
  blocks: Block[];

  backlinks: {
    noteId: string;
    noteTitle: string;
    contextPreview: string;
  }[];

  tags: string[];
  lastAccessedAt: number;
}

export interface SearchResultFragment {
  blockId: string;
  score: number;
  content: string;
  noteTitle: string;
}
