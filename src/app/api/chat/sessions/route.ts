import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createChatSession,
  getChatSessions,
} from '@/db/queries';
import { randomUUID } from 'node:crypto';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const sessions = await getChatSessions(session.userId);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Get chat sessions error:', error);
    return NextResponse.json({ error: '获取对话列表失败' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { title } = await request.json();
    const id = randomUUID();
    await createChatSession(id, session.userId, title || '新对话');

    return NextResponse.json({ id, title: title || '新对话' });
  } catch (error) {
    console.error('Create chat session error:', error);
    return NextResponse.json({ error: '创建对话失败' }, { status: 500 });
  }
}
