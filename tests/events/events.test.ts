import request from 'supertest';
import { GET as listEvents, POST as createEvent } from '@/app/api/events/route';
import {
  GET as getEvent,
  PATCH as updateEvent,
  DELETE as deleteEvent,
} from '@/app/api/events/[id]/route';
import { POST as createBooking } from '@/app/api/events/[id]/bookings/route';
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
  date: '2099-01-01T20:00:00.000Z',
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

  it('omits past events and includes upcoming ones', async () => {
    const past = await prisma.event.create({
      data: {
        ...validEvent,
        title: 'Test Past Listing',
        date: new Date('2020-01-01T20:00:00.000Z'),
        seatsAvailable: 100,
      },
    });
    const upcoming = await prisma.event.create({
      data: { ...validEvent, title: 'Test Upcoming Listing', seatsAvailable: 100 },
    });

    const res = await request(collectionServer).get('/api/events');
    const ids = res.body.events.map((e: { id: string }) => e.id);
    expect(ids).toContain(upcoming.id);
    expect(ids).not.toContain(past.id);

    await cleanupByTitlePrefix('Test ');
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

  it('rejects a non-positive totalSeats with a per-field error', async () => {
    const res = await request(collectionServer)
      .post('/api/events')
      .set('Cookie', adminCookie)
      .send({ ...validEvent, totalSeats: 0 });
    expect(res.status).toBe(400);
    expect(res.body.fields.totalSeats[0]).toMatch(/positive integer/i);
  });

  it('rejects a missing title with a per-field error', async () => {
    const res = await request(collectionServer)
      .post('/api/events')
      .set('Cookie', adminCookie)
      .send({ ...validEvent, title: undefined });
    expect(res.status).toBe(400);
    expect(res.body.fields.title[0]).toMatch(/title is required/i);
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

  it('PATCH resize does not erase a booking that lands between its read and write', async () => {
    const event = await prisma.event.create({
      data: { ...validEvent, title: 'Test Resize Toctou', totalSeats: 10, seatsAvailable: 10 },
    });
    const bookingUser = await prisma.user.create({
      data: { email: `test-resize-toctou-${Date.now()}@example.com`, passwordHash: 'x' },
    });
    const bookingToken = signToken({ sub: bookingUser.id, email: bookingUser.email, role: 'USER' });

    const patchServer = createTestServer({ PATCH: withParams(updateEvent, { id: event.id }) });
    const bookingServer = createTestServer({ POST: withParams(createBooking, { id: event.id }) });

    // Reproduces the real-world timing (admin reads the event, takes a while
    // to save, by which point a user has booked) deterministically: splice a
    // real booking request in right after the PATCH handler's first read of
    // `existing`, which both the buggy and fixed code paths start with.
    const originalFindUnique = prisma.event.findUnique.bind(prisma.event);
    let intercepted = false;
    const spy = jest.spyOn(prisma.event, 'findUnique').mockImplementation(((
      args: Parameters<typeof prisma.event.findUnique>[0],
    ) =>
      (async () => {
        const result = await originalFindUnique(args);
        if (!intercepted) {
          intercepted = true;
          await request(bookingServer)
            .post(`/api/events/${event.id}/bookings`)
            .set('Cookie', `token=${bookingToken}`)
            .send({ seats: 3 });
        }
        return result;
      })()) as unknown as typeof prisma.event.findUnique);

    try {
      const res = await request(patchServer)
        .patch(`/api/events/${event.id}`)
        .set('Cookie', adminCookie)
        .send({ totalSeats: 15 });
      expect(res.status).toBe(200);
    } finally {
      spy.mockRestore();
    }

    const finalEvent = await prisma.event.findUniqueOrThrow({ where: { id: event.id } });
    const { _sum } = await prisma.booking.aggregate({
      where: { eventId: event.id },
      _sum: { seats: true },
    });
    const bookedSeats = _sum.seats ?? 0;

    expect(finalEvent.seatsAvailable + bookedSeats).toBe(finalEvent.totalSeats);

    await prisma.booking.deleteMany({ where: { eventId: event.id } });
    await prisma.user.delete({ where: { id: bookingUser.id } });
  });

  it('DELETE rejects a non-admin', async () => {
    const server = createTestServer({ DELETE: withParams(deleteEvent, { id: eventId }) });
    const res = await request(server).delete(`/api/events/${eventId}`).set('Cookie', userCookie);
    expect(res.status).toBe(403);
  });

  it('DELETE rejects an event with existing bookings', async () => {
    const bookingUser = await prisma.user.create({
      data: { email: `test-delete-guard-${Date.now()}@example.com`, passwordHash: 'x' },
    });
    await prisma.booking.create({ data: { userId: bookingUser.id, eventId, seats: 1 } });

    const server = createTestServer({ DELETE: withParams(deleteEvent, { id: eventId }) });
    const res = await request(server).delete(`/api/events/${eventId}`).set('Cookie', adminCookie);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/existing booking/i);

    const stillThere = await prisma.event.findUnique({ where: { id: eventId } });
    expect(stillThere).not.toBeNull();

    // Clean up before afterEach's event cleanup runs, or it would hit the
    // same foreign key constraint this test is asserting on.
    await prisma.booking.deleteMany({ where: { eventId } });
    await prisma.user.delete({ where: { id: bookingUser.id } });
  });

  it('DELETE returns 400, not 500, when a booking lands after the booking-count check', async () => {
    const bookingUser = await prisma.user.create({
      data: { email: `test-delete-race-${Date.now()}@example.com`, passwordHash: 'x' },
    });
    await prisma.booking.create({ data: { userId: bookingUser.id, eventId, seats: 1 } });

    // Simulate the booking arriving after the handler counted zero bookings.
    const spy = jest.spyOn(prisma.booking, 'count').mockResolvedValueOnce(0 as never);
    try {
      const server = createTestServer({ DELETE: withParams(deleteEvent, { id: eventId }) });
      const res = await request(server).delete(`/api/events/${eventId}`).set('Cookie', adminCookie);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/existing booking/i);
    } finally {
      spy.mockRestore();
    }

    await prisma.booking.deleteMany({ where: { eventId } });
    await prisma.user.delete({ where: { id: bookingUser.id } });
  });

  it('DELETE removes the event as admin', async () => {
    const server = createTestServer({ DELETE: withParams(deleteEvent, { id: eventId }) });
    const res = await request(server).delete(`/api/events/${eventId}`).set('Cookie', adminCookie);
    expect(res.status).toBe(204);

    const stillThere = await prisma.event.findUnique({ where: { id: eventId } });
    expect(stillThere).toBeNull();
  });
});
