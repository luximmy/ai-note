import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getChatSession,
  getChatMessages,
  addChatMessage,
} from '@/db/queries';
import { randomUUID } from 'node:crypto';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const chatSession = await getChatSession(id, session.userId);
    if (!chatSession) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    const messages = await getChatMessages(id);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return NextResponse.json({ error: '获取消息失败' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const chatSession = await getChatSession(id, session.userId);
    if (!chatSession) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 });
    }

    const { role, content } = await request.json();
    const messageId = randomUUID();
    await addChatMessage(messageId, id, role, JSON.stringify(content));

    return NextResponse.json({ id: messageId });
  } catch (error) {
    console.error('Add chat message error:', error);
    return NextResponse.json({ error: '添加消息失败' }, { status: 500 });
  }
}
