import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, normalizeEmail, setAuthCookie, signToken } from '@/lib/auth';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const invalidCredentials = () =>
    NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });

  if (!user) {
    return invalidCredentials();
  }

  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    return invalidCredentials();
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  const response = NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
  setAuthCookie(response, token);
  return response;
}
