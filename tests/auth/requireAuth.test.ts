import { AuthError, requireAdmin, requireAuth, signToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function requestWithCookie(cookie: string): Request {
  return new Request('http://localhost/api/whoami', {
    headers: { cookie },
  });
}

describe('requireAuth', () => {
  it('returns the payload for a valid token cookie', () => {
    const token = signToken({ sub: 'user-1', email: 'a@example.com', role: 'USER' });

    const payload = requireAuth(requestWithCookie(`token=${token}`));

    expect(payload).toMatchObject({ sub: 'user-1', email: 'a@example.com', role: 'USER' });
  });

  it('accepts a Bearer authorization header', () => {
    const token = signToken({ sub: 'user-1', email: 'a@example.com', role: 'USER' });

    const payload = requireAuth(
      new Request('http://localhost/api/whoami', {
        headers: { authorization: `Bearer ${token}` },
      }),
    );

    expect(payload.sub).toBe('user-1');
  });

  it('throws when no token is present', () => {
    expect(() => requireAuth(new Request('http://localhost/api/whoami'))).toThrow(AuthError);
  });

  it('throws when the token is malformed', () => {
    expect(() => requireAuth(requestWithCookie('token=not-a-real-token'))).toThrow(AuthError);
  });
});

describe('requireAdmin', () => {
  const EMAIL_PREFIX = 'test-require-admin-';

  async function createUser(suffix: string, role: 'USER' | 'ADMIN') {
    return prisma.user.create({
      data: { email: `${EMAIL_PREFIX}${suffix}@example.com`, passwordHash: 'x', role },
    });
  }

  function cookieFor(user: { id: string; email: string }, tokenRole: 'USER' | 'ADMIN') {
    return `token=${signToken({ sub: user.id, email: user.email, role: tokenRole })}`;
  }

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
    await prisma.$disconnect();
  });

  it('passes for a user who is an admin in the database', async () => {
    const admin = await createUser('admin', 'ADMIN');

    const payload = await requireAdmin(requestWithCookie(cookieFor(admin, 'ADMIN')));

    expect(payload.sub).toBe(admin.id);
  });

  it('throws 403 for a non-admin user', async () => {
    const user = await createUser('plain-user', 'USER');

    await expect(requireAdmin(requestWithCookie(cookieFor(user, 'USER')))).rejects.toMatchObject({
      name: 'AuthError',
      status: 403,
    });
  });

  it('throws 403 for a demoted admin whose token still says ADMIN', async () => {
    const user = await createUser('demoted', 'ADMIN');
    const cookie = cookieFor(user, 'ADMIN');
    await prisma.user.update({ where: { id: user.id }, data: { role: 'USER' } });

    await expect(requireAdmin(requestWithCookie(cookie))).rejects.toMatchObject({ status: 403 });
  });

  it('throws 403 for a deleted admin whose token is still valid', async () => {
    const user = await createUser('deleted', 'ADMIN');
    const cookie = cookieFor(user, 'ADMIN');
    await prisma.user.delete({ where: { id: user.id } });

    await expect(requireAdmin(requestWithCookie(cookie))).rejects.toMatchObject({ status: 403 });
  });

  it('throws 401 when there is no token', async () => {
    await expect(requireAdmin(new Request('http://localhost/api/whoami'))).rejects.toMatchObject({
      status: 401,
    });
  });
});
