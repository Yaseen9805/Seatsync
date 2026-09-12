import { createServer, type Server } from 'node:http';

type RouteHandler = (request: Request) => Promise<Response>;
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function createTestServer(handlers: Partial<Record<Method, RouteHandler>>): Server {
  // Each server instance gets its own fake IP so tests that don't care
  // about rate limiting never share an identity - across test files (no
  // cross-file interference) or across separate test runs (the real test
  // DB isn't reset between `npm test` invocations, so a shared/fixed IP
  // would accumulate rate-limit rows over repeated runs and eventually
  // make unrelated tests flaky). Tests that do care can still override
  // this per-request with `.set('X-Forwarded-For', ...)`.
  const defaultTestIp = `test-${Math.random().toString(36).slice(2)}`;

  return createServer(async (req, res) => {
    const method = (req.method ?? 'GET') as Method;
    const handler = handlers[method];
    if (!handler) {
      res.statusCode = 405;
      res.end();
      return;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    const hasBody = method !== 'GET' && method !== 'DELETE' && body !== undefined;

    const headers = new Headers(req.headers as HeadersInit);
    if (!headers.has('x-forwarded-for')) {
      headers.set('x-forwarded-for', defaultTestIp);
    }

    const request = new Request(`http://localhost${req.url}`, {
      method,
      headers,
      body: hasBody ? body : undefined,
    });

    const response = await handler(request);
    res.statusCode = response.status;
    const setCookies = response.headers.getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      res.setHeader('set-cookie', setCookies);
    }
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') return;
      res.setHeader(key, value);
    });
    const responseBody = Buffer.from(await response.arrayBuffer());
    res.end(responseBody);
  });
}
