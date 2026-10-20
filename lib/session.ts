import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME, isAdminInDb, tryVerifyToken, type AuthPayload } from '@/lib/auth';

export async function getSession(): Promise<AuthPayload | null> {
  const store = await cookies();
  return tryVerifyToken(store.get(AUTH_COOKIE_NAME)?.value);
}

export async function requireAdminSession(): Promise<AuthPayload> {
  const session = await getSession();
  if (!session || !(await isAdminInDb(session.sub))) {
    redirect('/login');
  }
  return session;
}
