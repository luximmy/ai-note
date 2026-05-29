import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getChatSession,
  updateChatSessionTitle,
  deleteChatSession,
} from '@/db/queries';

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

    return NextResponse.json({ session: chatSession });
  } catch (error) {
    console.error('Get chat session error:', error);
    return NextResponse.json({ error: '获取对话失败' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    const { title } = await request.json();
    await updateChatSessionTitle(id, session.userId, title);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update chat session error:', error);
    return NextResponse.json({ error: '更新对话失败' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;
    await deleteChatSession(id, session.userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete chat session error:', error);
    return NextResponse.json({ error: '删除对话失败' }, { status: 500 });
  }
}
