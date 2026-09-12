import { z } from 'zod';
import { isValidEmail } from '@/lib/auth';

// Reuses isValidEmail from lib/auth.ts rather than Zod's own (stricter)
// built-in email check, so behavior doesn't drift from what the app has
// always accepted.
const email = z
  .string({ error: 'Email is required' })
  .min(1, 'Email is required')
  .transform((value) => value.trim().toLowerCase())
  .refine(isValidEmail, { message: 'Invalid email address' });

export const signupSchema = z.object({
  email,
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

function nonEmptyString(label: string) {
  return z
    .string({ error: `${label} is required` })
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, { message: `${label} is required` });
}

const eventDate = z
  .string({ error: 'date is required' })
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()), { message: 'date must be a valid date' });

const totalSeats = z.coerce
  .number({ error: 'totalSeats must be a positive integer' })
  .int('totalSeats must be a positive integer')
  .min(1, 'totalSeats must be a positive integer');

export const createEventSchema = z.object({
  title: nonEmptyString('title'),
  description: nonEmptyString('description'),
  venue: nonEmptyString('venue'),
  date: eventDate,
  totalSeats,
});

// All fields optional for PATCH's partial-update semantics - a field is
// only validated when the caller actually sends it.
export const updateEventSchema = z.object({
  title: nonEmptyString('title').optional(),
  description: nonEmptyString('description').optional(),
  venue: nonEmptyString('venue').optional(),
  date: eventDate.optional(),
  totalSeats: totalSeats.optional(),
});
