import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';

/**
 * Converts a ZodError into the same `{ error }` shape used elsewhere in
 * the app (see lib/auth.ts's toAuthErrorResponse), with a `fields` map of
 * per-field messages attached for the client to show inline.
 */
export function validationErrorResponse(error: ZodError): NextResponse {
  return NextResponse.json(
    { error: 'Invalid request', fields: error.flatten().fieldErrors },
    { status: 400 },
  );
}
