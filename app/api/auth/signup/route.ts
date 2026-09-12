import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, setAuthCookie, signToken, toAuthErrorResponse } from '@/lib/auth';
import { enforceRateLimit, getClientIp, SIGNUP_IP_RATE_LIMIT } from '@/lib/rateLimit';
import { signupSchema } from '@/lib/schemas';
import { validationErrorResponse } from '@/lib/validation';

export async function POST(request: Request) {
  try {
    await enforceRateLimit(
      `signup:ip:${getClientIp(request)}`,
      SIGNUP_IP_RATE_LIMIT,
      'Too many signup attempts from this IP, please try again later',
    );
  } catch (err) {
    return toAuthErrorResponse(err);
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return validationErrorResponse(parsed.error);
  }
  const { email, password } = parsed.data;

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
