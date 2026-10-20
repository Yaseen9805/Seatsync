import request from 'supertest';
import { GET } from '@/app/api/health/route';
import { prisma } from '@/lib/prisma';
import { createTestServer } from './helpers/testServer';

const server = createTestServer({ GET });

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/health', () => {
  it('reports ok when the database answers', async () => {
    const res = await request(server).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'connected' });
  });

  it('returns 503 when the database is unreachable', async () => {
    const spy = jest.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('db down'));
    try {
      const res = await request(server).get('/api/health');
      expect(res.status).toBe(503);
      expect(res.body.database).toBe('disconnected');
    } finally {
      spy.mockRestore();
    }
  });
});
