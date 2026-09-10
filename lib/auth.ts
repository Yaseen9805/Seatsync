import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { NextResponse } from 'next/server';
import type { Role } from '@/app/generated/prisma/enums';

const SALT_ROUNDS = 10;
const TOKEN_TTL = '7d';
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
export const AUTH_COOKIE_NAME = 'token';

export type AuthPayload = {
  sub: string;
  email: string;
  role: Role;
};

export class AuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }
  return secret;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token: string): AuthPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch {
    throw new AuthError('Invalid or expired token');
  }
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((pair) => {
      const [key, ...rest] = pair.trim().split('=');
      return [key, decodeURIComponent(rest.join('='))];
    }),
  );
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }
  const cookies = parseCookies(request.headers.get('cookie'));
  return cookies[AUTH_COOKIE_NAME] ?? null;
}

export function requireAuth(request: Request): AuthPayload {
  const token = getTokenFromRequest(request);
  if (!token) {
    throw new AuthError('Authentication required');
  }
  return verifyToken(token);
}

export function requireAdmin(request: Request): AuthPayload {
  const payload = requireAuth(request);
  if (payload.role !== 'ADMIN') {
    throw new AuthError('Admin access required', 403);
  }
  return payload;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS,
  });
}
