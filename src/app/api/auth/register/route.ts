import { NextResponse } from 'next/server';
import { hashPassword, setSessionCookie } from '@/lib/auth';
import { createUser, getUserByEmail, migrateDefaultUserDocuments } from '@/db/queries';
import { randomUUID } from 'node:crypto';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '邮箱、密码和名称都是必填项' },
        { status: 400 }
      );
    }

    if (typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: '邮箱格式无效' },
        { status: 400 }
      );
    }

    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: '密码至少需要 8 个字符' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: '名称不能为空' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await getUserByEmail(email.toLowerCase().trim());
    if (existingUser) {
      return NextResponse.json(
        { error: '该邮箱已被注册' },
        { status: 409 }
      );
    }

    // Create user
    const userId = randomUUID();
    const passwordHash = await hashPassword(password);
    const now = Date.now();

    await createUser(userId, email.toLowerCase().trim(), passwordHash, name.trim(), now);

    // Migrate default user documents if any exist (first user gets them)
    const migratedCount = await migrateDefaultUserDocuments(userId);
    if (migratedCount > 0) {
      console.log(`[Auth] Migrated ${migratedCount} demo documents to new user`);
    }

    // Set session cookie
    await setSessionCookie({ userId, email: email.toLowerCase().trim() });

    return NextResponse.json({
      success: true,
      user: { id: userId, email: email.toLowerCase().trim(), name: name.trim() },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
