import { createServer, type Server } from 'node:http';

type RouteHandler = (request: Request) => Promise<Response>;
type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export function createTestServer(handlers: Partial<Record<Method, RouteHandler>>): Server {
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

    const request = new Request(`http://localhost${req.url}`, {
      method,
      headers: req.headers as HeadersInit,
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
