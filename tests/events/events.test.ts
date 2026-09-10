import request from 'supertest';
import { GET as listEvents, POST as createEvent } from '@/app/api/events/route';
import {
  GET as getEvent,
  PATCH as updateEvent,
  DELETE as deleteEvent,
} from '@/app/api/events/[id]/route';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { createTestServer } from '../helpers/testServer';
import { withParams } from '../helpers/withParams';

const adminToken = signToken({ sub: 'admin-1', email: 'admin@example.com', role: 'ADMIN' });
const userToken = signToken({ sub: 'user-1', email: 'user@example.com', role: 'USER' });
const adminCookie = `token=${adminToken}`;
const userCookie = `token=${userToken}`;

const collectionServer = createTestServer({ GET: listEvents, POST: createEvent });

const validEvent = {
  title: 'Test Concert',
  description: 'A test event',
  venue: 'Test Arena',
  date: '2027-01-01T20:00:00.000Z',
  totalSeats: 100,
};

async function cleanupByTitlePrefix(prefix: string) {
  await prisma.event.deleteMany({ where: { title: { startsWith: prefix } } });
}

afterAll(async () => {
  await cleanupByTitlePrefix('Test ');
  await prisma.$disconnect();
});

describe('GET /api/events', () => {
  it('lists events without auth', async () => {
    const res = await request(collectionServer).get('/api/events');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
  });
});

describe('POST /api/events', () => {
  afterEach(async () => {
    await cleanupByTitlePrefix('Test ');
  });

  it('rejects requests with no auth', async () => {
    const res = await request(collectionServer).post('/api/events').send(validEvent);
    expect(res.status).toBe(401);
  });

  it('rejects requests from a non-admin user', async () => {
    const res = await request(collectionServer)
      .post('/api/events')
      .set('Cookie', userCookie)
      .send(validEvent);
    expect(res.status).toBe(403);
  });

  it('creates an event as admin, with seatsAvailable seeded from totalSeats', async () => {
    const res = await request(collectionServer)
      .post('/api/events')
      .set('Cookie', adminCookie)
      .send(validEvent);

    expect(res.status).toBe(201);
    expect(res.body.event).toMatchObject({
      title: validEvent.title,
      totalSeats: 100,
      seatsAvailable: 100,
    });
  });

  it('rejects a non-positive totalSeats', async () => {
    const res = await request(collectionServer)
      .post('/api/events')
      .set('Cookie', adminCookie)
      .send({ ...validEvent, totalSeats: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects a missing title', async () => {
    const res = await request(collectionServer)
      .post('/api/events')
      .set('Cookie', adminCookie)
      .send({ ...validEvent, title: undefined });
    expect(res.status).toBe(400);
  });
});

describe('/api/events/[id]', () => {
  let eventId: string;

  beforeEach(async () => {
    const event = await prisma.event.create({
      data: { ...validEvent, seatsAvailable: validEvent.totalSeats },
    });
    eventId = event.id;
  });

  afterEach(async () => {
    await cleanupByTitlePrefix('Test ');
  });

  it('GET returns the event', async () => {
    const server = createTestServer({ GET: withParams(getEvent, { id: eventId }) });
    const res = await request(server).get(`/api/events/${eventId}`);
    expect(res.status).toBe(200);
    expect(res.body.event.id).toBe(eventId);
  });

  it('GET returns 404 for an unknown id', async () => {
    const server = createTestServer({ GET: withParams(getEvent, { id: 'does-not-exist' }) });
    const res = await request(server).get('/api/events/does-not-exist');
    expect(res.status).toBe(404);
  });

  it('PATCH rejects a non-admin', async () => {
    const server = createTestServer({ PATCH: withParams(updateEvent, { id: eventId }) });
    const res = await request(server)
      .patch(`/api/events/${eventId}`)
      .set('Cookie', userCookie)
      .send({ title: 'Renamed' });
    expect(res.status).toBe(403);
  });

  it('PATCH updates fields as admin', async () => {
    const server = createTestServer({ PATCH: withParams(updateEvent, { id: eventId }) });
    const res = await request(server)
      .patch(`/api/events/${eventId}`)
      .set('Cookie', adminCookie)
      .send({ title: 'Test Renamed Concert' });
    expect(res.status).toBe(200);
    expect(res.body.event.title).toBe('Test Renamed Concert');
  });

  it('PATCH resizing totalSeats shifts seatsAvailable by the same delta', async () => {
    // book 10 seats by decrementing directly, simulating pre-existing bookings
    await prisma.event.update({
      where: { id: eventId },
      data: { seatsAvailable: { decrement: 10 } },
    });

    const server = createTestServer({ PATCH: withParams(updateEvent, { id: eventId }) });
    const res = await request(server)
      .patch(`/api/events/${eventId}`)
      .set('Cookie', adminCookie)
      .send({ totalSeats: 150 });

    expect(res.status).toBe(200);
    expect(res.body.event.totalSeats).toBe(150);
    expect(res.body.event.seatsAvailable).toBe(140);
  });

  it('PATCH rejects shrinking totalSeats below already-booked seats', async () => {
    await prisma.event.update({
      where: { id: eventId },
      data: { seatsAvailable: { decrement: 90 } },
    });

    const server = createTestServer({ PATCH: withParams(updateEvent, { id: eventId }) });
    const res = await request(server)
      .patch(`/api/events/${eventId}`)
      .set('Cookie', adminCookie)
      .send({ totalSeats: 5 });

    expect(res.status).toBe(400);
  });

  it('DELETE rejects a non-admin', async () => {
    const server = createTestServer({ DELETE: withParams(deleteEvent, { id: eventId }) });
    const res = await request(server).delete(`/api/events/${eventId}`).set('Cookie', userCookie);
    expect(res.status).toBe(403);
  });

  it('DELETE removes the event as admin', async () => {
    const server = createTestServer({ DELETE: withParams(deleteEvent, { id: eventId }) });
    const res = await request(server).delete(`/api/events/${eventId}`).set('Cookie', adminCookie);
    expect(res.status).toBe(204);

    const stillThere = await prisma.event.findUnique({ where: { id: eventId } });
    expect(stillThere).toBeNull();
  });
});
