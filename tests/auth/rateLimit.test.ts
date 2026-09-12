import request from 'supertest';
import { POST as signup } from '@/app/api/auth/signup/route';
import { POST as login } from '@/app/api/auth/login/route';
import { prisma } from '@/lib/prisma';
import { LOGIN_EMAIL_RATE_LIMIT, LOGIN_IP_RATE_LIMIT, SIGNUP_IP_RATE_LIMIT } from '@/lib/rateLimit';
import { createTestServer } from '../helpers/testServer';

const signupServer = createTestServer({ POST: signup });
const loginServer = createTestServer({ POST: login });

const EMAIL_PREFIX = 'ratelimit-test-';
// The rate-limit table isn't reset between separate `npm test` runs, so
// every identifier below (IPs and emails) is namespaced to this run - a
// fixed identifier would eventually collide with leftover rows from an
// earlier run within the same rolling window.
const RUN_ID = Date.now();

afterAll(async () => {
  await prisma.rateLimitAttempt.deleteMany({ where: { key: { contains: 'ratelimit-test' } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
  await prisma.$disconnect();
});

describe('rate limiting', () => {
  it('returns 429 once the signup IP limit is exceeded', async () => {
    const ip = `ratelimit-test-signup-ip-${RUN_ID}`;

    for (let i = 0; i < SIGNUP_IP_RATE_LIMIT.max; i++) {
      const res = await request(signupServer)
        .post('/api/auth/signup')
        .set('X-Forwarded-For', ip)
        .send({
          email: `${EMAIL_PREFIX}signup-flood-${RUN_ID}-${i}@example.com`,
          password: 'password123',
        });
      expect(res.status).toBe(201);
    }

    const res = await request(signupServer)
      .post('/api/auth/signup')
      .set('X-Forwarded-For', ip)
      .send({
        email: `${EMAIL_PREFIX}signup-flood-${RUN_ID}-over@example.com`,
        password: 'password123',
      });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many signup attempts/i);
  }, 20_000);

  it('returns 429 once the login IP limit is exceeded', async () => {
    const ip = `ratelimit-test-login-ip-${RUN_ID}`;

    for (let i = 0; i < LOGIN_IP_RATE_LIMIT.max; i++) {
      const res = await request(loginServer)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({
          email: `${EMAIL_PREFIX}login-ip-flood-${RUN_ID}-${i}@example.com`,
          password: 'wrong',
        });
      expect(res.status).toBe(401);
    }

    const res = await request(loginServer)
      .post('/api/auth/login')
      .set('X-Forwarded-For', ip)
      .send({
        email: `${EMAIL_PREFIX}login-ip-flood-${RUN_ID}-over@example.com`,
        password: 'wrong',
      });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many login attempts from this ip/i);
  }, 20_000);

  it('returns 429 once the login email limit is exceeded, tighter than the IP limit', async () => {
    const email = `${EMAIL_PREFIX}login-email-flood-${RUN_ID}@example.com`;
    expect(LOGIN_EMAIL_RATE_LIMIT.max).toBeLessThan(LOGIN_IP_RATE_LIMIT.max);

    for (let i = 0; i < LOGIN_EMAIL_RATE_LIMIT.max; i++) {
      const res = await request(loginServer)
        .post('/api/auth/login')
        .set('X-Forwarded-For', `ratelimit-test-login-email-ip-${RUN_ID}-${i}`)
        .send({ email, password: 'wrong' });
      expect(res.status).toBe(401);
    }

    const res = await request(loginServer)
      .post('/api/auth/login')
      .set('X-Forwarded-For', `ratelimit-test-login-email-ip-${RUN_ID}-over`)
      .send({ email, password: 'wrong' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many login attempts for this account/i);
  }, 20_000);
});
