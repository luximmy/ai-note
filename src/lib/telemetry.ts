// src/lib/telemetry.ts

export type SaveEventType =
  | 'success'
  | 'failure'
  | 'rollback'
  | 'out_of_order';

export interface SaveEvent {
  type: SaveEventType;
  noteId: string;
  blockId: string;
  seq: number;
  error?: string;
  timestamp: number;
}

// Mock sink — 后续替换为真实埋点平台
export function emitSaveEvent(event: SaveEvent): void {
  const label = {
    success: '🟢 同步成功',
    failure: '🔴 保存失败',
    rollback: '🟡 状态回滚',
    out_of_order: '⚠️ 乱序拦截',
  }[event.type];

  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[${label}] note=${event.noteId} block=${event.blockId} seq=${event.seq}`,
      event.error ? `error=${event.error}` : '',
    );
  }
}
