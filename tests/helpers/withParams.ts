type RouteContext<P extends Record<string, string>> = { params: Promise<P> };

export function withParams<P extends Record<string, string>>(
  handler: (request: Request, context: RouteContext<P>) => Promise<Response>,
  params: P,
): (request: Request) => Promise<Response> {
  return (request: Request) => handler(request, { params: Promise.resolve(params) });
}
