import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, isValidEmail, normalizeEmail, setAuthCookie, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'Email is already registered' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash },
  });

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  const response = NextResponse.json(
    { user: { id: user.id, email: user.email, role: user.role } },
    { status: 201 },
  );
  setAuthCookie(response, token);
  return response;
}
