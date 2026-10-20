import { execSync } from 'node:child_process';

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

run('prisma generate');
if (process.env.VERCEL_ENV === 'production') {
  run('prisma migrate deploy');
} else {
  console.log('Skipping prisma migrate deploy (not a Vercel production build)');
}
run('next build');
