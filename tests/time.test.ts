import { fromDatetimeLocal, toDatetimeLocal } from '@/lib/time';

describe('lib/time', () => {
  it('toDatetimeLocal renders a UTC instant as IST', () => {
    expect(toDatetimeLocal(new Date('2026-12-01T13:30:00Z'))).toBe('2026-12-01T19:00');
  });

  it('toDatetimeLocal rolls over midnight correctly', () => {
    expect(toDatetimeLocal(new Date('2026-12-31T19:00:00Z'))).toBe('2027-01-01T00:30');
  });

  it('fromDatetimeLocal reads the typed value as IST', () => {
    expect(fromDatetimeLocal('2026-12-01T19:00').toISOString()).toBe('2026-12-01T13:30:00.000Z');
  });

  it('round-trips without shifting the event', () => {
    const original = new Date('2026-12-01T13:30:00.000Z');
    expect(fromDatetimeLocal(toDatetimeLocal(original)).toISOString()).toBe(original.toISOString());
  });
});
