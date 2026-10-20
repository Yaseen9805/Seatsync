import { ImageResponse } from 'next/og';

export const alt = 'SeatSync: concurrency-safe event booking';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 96,
        background: '#0a0a0a',
        color: '#fafafa',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 40 }}>
        <div style={{ width: 24, height: 24, borderRadius: 12, background: '#73f8a8' }} />
        SeatSync
      </div>
      <div style={{ marginTop: 40, fontSize: 84, fontWeight: 700, lineHeight: 1.1 }}>
        Concurrency-safe event booking
      </div>
      <div style={{ marginTop: 32, fontSize: 34, color: '#a1a1aa' }}>
        300 simultaneous requests for 30 seats. Exactly 30 booked.
      </div>
    </div>,
    size,
  );
}
