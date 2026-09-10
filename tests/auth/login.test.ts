import request from 'supertest';
import { POST as signup } from '@/app/api/auth/signup/route';
import { POST as login } from '@/app/api/auth/login/route';
import { prisma } from '@/lib/prisma';
import { createTestServer } from '../helpers/testServer';

const server = createTestServer({ POST: login });
const signupServer = createTestServer({ POST: signup });

const email = 'login-test@example.com';
const password = 'password123';

beforeAll(async () => {
  await request(signupServer).post('/api/auth/signup').send({ email, password });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email } });
  await prisma.$disconnect();
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials and sets an auth cookie', async () => {
    const res = await request(server).post('/api/auth/login').send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email, role: 'USER' });
    expect(res.headers['set-cookie']?.[0]).toMatch(/^token=/);
  });

  it('rejects a wrong password', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid email or password/i);
  });

  it('rejects an unknown email', async () => {
    const res = await request(server)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password });

    expect(res.status).toBe(401);
  });

  it('rejects a missing password', async () => {
    const res = await request(server).post('/api/auth/login').send({ email });

    expect(res.status).toBe(400);
  });
});
