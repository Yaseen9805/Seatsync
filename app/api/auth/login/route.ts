import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, setAuthCookie, signToken, toAuthErrorResponse } from '@/lib/auth';
import {
  enforceRateLimit,
  getClientIp,
  LOGIN_EMAIL_RATE_LIMIT,
  LOGIN_IP_RATE_LIMIT,
} from '@/lib/rateLimit';
import { loginSchema } from '@/lib/schemas';
import { validationErrorResponse } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(
      `login:ip:${getClientIp(request)}`,
      LOGIN_IP_RATE_LIMIT,
      'Too many login attempts from this IP, please try again later',
    );
  } catch (err) {
    return toAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { email, password } = parsed.data;

  try {
    await enforceRateLimit(
      `login:email:${email}`,
      LOGIN_EMAIL_RATE_LIMIT,
      'Too many login attempts for this account, please try again later',
    );
  } catch (err) {
    return toAuthErrorResponse(err);
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
