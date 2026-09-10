import { AuthError, requireAdmin, requireAuth, signToken } from '@/lib/auth';

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
  it('passes for an admin token', () => {
    const token = signToken({ sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });

    const payload = requireAdmin(requestWithCookie(`token=${token}`));

    expect(payload.role).toBe('ADMIN');
  });

  it('throws 403 for a non-admin token', () => {
    const token = signToken({ sub: 'user-1', email: 'a@example.com', role: 'USER' });

    expect(() => requireAdmin(requestWithCookie(`token=${token}`))).toThrow(AuthError);
    try {
      requireAdmin(requestWithCookie(`token=${token}`));
    } catch (err) {
      expect((err as AuthError).status).toBe(403);
    }
  });
});
