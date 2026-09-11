import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { PrismaClient } from '@/app/generated/prisma/client';

// The Neon serverless driver needs an explicit WebSocket implementation
// outside browser/edge runtimes (plain Node.js, e.g. Vercel's Node functions,
// or Jest). See https://neon.tech/docs/serverless/serverless-driver#websocket-support.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Default pool size (10) queues too aggressively under booking bursts, since
// every booking for a given event serializes on that event's row lock -
// widening the pool lets more requests hold a connection while they wait
// their turn instead of failing to even acquire one.
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL, max: 20 });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
