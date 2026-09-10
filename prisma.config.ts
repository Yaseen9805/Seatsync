import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Migrations run over the direct (non-pooled) connection; the app itself
    // connects through the pooled DATABASE_URL via @prisma/adapter-neon.
    url: process.env['DIRECT_URL'],
  },
});
