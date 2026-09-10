import request from 'supertest';
import { POST } from '@/app/api/auth/signup/route';
import { prisma } from '@/lib/prisma';
import { createTestServer } from '../helpers/testServer';

const server = createTestServer({ POST });

async function cleanup(email: string) {
  await prisma.user.deleteMany({ where: { email } });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/auth/signup', () => {
  const email = 'signup-test@example.com';

  afterEach(async () => {
    await cleanup(email);
  });

  it('creates a user and sets an auth cookie', async () => {
    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email, password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, role: 'USER' });
    expect(res.body.user.id).toBeDefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/^token=/);
  });

  it('rejects a duplicate email', async () => {
    await request(server).post('/api/auth/signup').send({ email, password: 'password123' });

    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email, password: 'anotherpassword' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('treats email case-insensitively for duplicates', async () => {
    await request(server).post('/api/auth/signup').send({ email, password: 'password123' });

    const res = await request(server)
      .post('/api/auth/signup')
      .send({ email: email.toUpperCase(), password: 'anotherpassword' });

    expect(res.status).toBe(409);
  });

  it('rejects a short password', async () => {
    const res = await request(server).post('/api/auth/signup').send({ email, password: 'short' });

    expect(res.status).toBe(400);
  });

  it('rejects a missing email', async () => {
    const res = await request(server).post('/api/auth/signup').send({ password: 'password123' });

    expect(res.status).toBe(400);
  });
});
