export const APP_TIME_ZONE = 'Asia/Kolkata';
const APP_UTC_OFFSET = '+05:30'; // India has no daylight saving

/** Date -> "YYYY-MM-DDTHH:mm" in IST, for <input type="datetime-local"> */
export function toDatetimeLocal(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: APP_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** "YYYY-MM-DDTHH:mm" typed as IST -> Date */
export function fromDatetimeLocal(value: string): Date {
  return new Date(`${value}:00${APP_UTC_OFFSET}`);
}
