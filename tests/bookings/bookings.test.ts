import request from 'supertest';
import {
  POST as createBooking,
  DELETE as cancelBooking,
} from '@/app/api/events/[id]/bookings/route';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { createTestServer } from '../helpers/testServer';
import { withParams } from '../helpers/withParams';

const EMAIL_PREFIX = 'booking-test-';

async function createTestUser(suffix: string) {
  const user = await prisma.user.create({
    data: {
      email: `${EMAIL_PREFIX}${suffix}@example.com`,
      passwordHash: await hashPassword('password123'),
    },
  });
  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  return { user, cookie: `token=${token}` };
}

async function createTestEvent(totalSeats: number) {
  return prisma.event.create({
    data: {
      title: 'Booking Test Event',
      description: 'A test event',
      venue: 'Test Arena',
      date: new Date('2027-01-01T20:00:00.000Z'),
      totalSeats,
      seatsAvailable: totalSeats,
    },
  });
}

function serverFor(eventId: string) {
  return createTestServer({
    POST: withParams(createBooking, { id: eventId }),
    DELETE: withParams(cancelBooking, { id: eventId }),
  });
}

afterAll(async () => {
  await prisma.booking.deleteMany({ where: { user: { email: { startsWith: EMAIL_PREFIX } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
  await prisma.event.deleteMany({ where: { title: 'Booking Test Event' } });
  await prisma.$disconnect();
});

describe('POST /api/events/[id]/bookings', () => {
  it('rejects requests with no auth', async () => {
    const event = await createTestEvent(10);
    const res = await request(serverFor(event.id))
      .post(`/api/events/${event.id}/bookings`)
      .send({ seats: 1 });
    expect(res.status).toBe(401);
  });

  it('rejects a non-positive seats value', async () => {
    const event = await createTestEvent(10);
    const { cookie } = await createTestUser('bad-seats');
    const res = await request(serverFor(event.id))
      .post(`/api/events/${event.id}/bookings`)
      .set('Cookie', cookie)
      .send({ seats: 0 });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown event', async () => {
    const { cookie } = await createTestUser('unknown-event');
    const res = await request(serverFor('does-not-exist'))
      .post('/api/events/does-not-exist/bookings')
      .set('Cookie', cookie)
      .send({ seats: 1 });
    expect(res.status).toBe(404);
  });

  it('creates a booking and decrements seatsAvailable', async () => {
    const event = await createTestEvent(10);
    const { cookie } = await createTestUser('happy-path');

    const res = await request(serverFor(event.id))
      .post(`/api/events/${event.id}/bookings`)
      .set('Cookie', cookie)
      .send({ seats: 3 });

    expect(res.status).toBe(201);
    expect(res.body.booking).toMatchObject({ eventId: event.id, seats: 3 });

    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated?.seatsAvailable).toBe(7);
  });

  it('rejects a second booking from the same user for the same event', async () => {
    const event = await createTestEvent(10);
    const { cookie } = await createTestUser('duplicate');
    const server = serverFor(event.id);

    const first = await request(server)
      .post(`/api/events/${event.id}/bookings`)
      .set('Cookie', cookie)
      .send({ seats: 1 });
    expect(first.status).toBe(201);

    const second = await request(server)
      .post(`/api/events/${event.id}/bookings`)
      .set('Cookie', cookie)
      .send({ seats: 1 });
    expect(second.status).toBe(409);

    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated?.seatsAvailable).toBe(9);
  });

  it('rejects booking more seats than are available', async () => {
    const event = await createTestEvent(2);
    const { cookie } = await createTestUser('too-many-seats');

    const res = await request(serverFor(event.id))
      .post(`/api/events/${event.id}/bookings`)
      .set('Cookie', cookie)
      .send({ seats: 3 });

    expect(res.status).toBe(409);
    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated?.seatsAvailable).toBe(2);
  });

  it('never oversells under concurrent requests for the last seats', async () => {
    const SEATS = 5;
    const REQUESTERS = 15;
    const event = await createTestEvent(SEATS);
    const server = serverFor(event.id);

    const users = await Promise.all(
      Array.from({ length: REQUESTERS }, (_, i) => createTestUser(`race-${i}`)),
    );

    const responses = await Promise.all(
      users.map(({ cookie }) =>
        request(server)
          .post(`/api/events/${event.id}/bookings`)
          .set('Cookie', cookie)
          .send({ seats: 1 }),
      ),
    );

    const succeeded = responses.filter((res) => res.status === 201);
    const rejected = responses.filter((res) => res.status === 409);
    expect(succeeded).toHaveLength(SEATS);
    expect(rejected).toHaveLength(REQUESTERS - SEATS);

    const updated = await prisma.event.findUnique({ where: { id: event.id } });
    expect(updated?.seatsAvailable).toBe(0);

    const bookingCount = await prisma.booking.count({ where: { eventId: event.id } });
    expect(bookingCount).toBe(SEATS);
  }, 20_000);
});

describe('DELETE /api/events/[id]/bookings', () => {
  it('rejects requests with no auth', async () => {
    const event = await createTestEvent(10);
    const res = await request(serverFor(event.id)).delete(`/api/events/${event.id}/bookings`);
    expect(res.status).toBe(401);
  });

  it('returns 404 when the user has no booking for the event', async () => {
    const event = await createTestEvent(10);
    const { cookie } = await createTestUser('no-booking');
    const res = await request(serverFor(event.id))
      .delete(`/api/events/${event.id}/bookings`)
      .set('Cookie', cookie);
    expect(res.status).toBe(404);
  });

  it('cancels a booking and restores seatsAvailable', async () => {
    const event = await createTestEvent(10);
    const { cookie } = await createTestUser('cancel');
    const server = serverFor(event.id);

    await request(server)
      .post(`/api/events/${event.id}/bookings`)
      .set('Cookie', cookie)
      .send({ seats: 4 });
    const afterBooking = await prisma.event.findUnique({ where: { id: event.id } });
    expect(afterBooking?.seatsAvailable).toBe(6);

    const res = await request(server)
      .delete(`/api/events/${event.id}/bookings`)
      .set('Cookie', cookie);
    expect(res.status).toBe(204);

    const afterCancel = await prisma.event.findUnique({ where: { id: event.id } });
    expect(afterCancel?.seatsAvailable).toBe(10);
  });
});
