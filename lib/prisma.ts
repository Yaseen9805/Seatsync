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

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
