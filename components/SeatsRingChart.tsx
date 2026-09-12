'use client';

import { RingChart } from '@/components/charts/ring-chart';
import { Ring } from '@/components/charts/ring';
import { RingCenter } from '@/components/charts/ring-center';

export function SeatsRingChart({
  seatsAvailable,
  totalSeats,
}: {
  seatsAvailable: number;
  totalSeats: number;
}) {
  const booked = totalSeats - seatsAvailable;

  return (
    <RingChart size={140} data={[{ label: 'Booked', value: booked, maxValue: totalSeats }]}>
      <Ring index={0} />
      <RingCenter>
        {() => (
          <div className="flex flex-col items-center">
            <span className="text-2xl font-semibold tabular-nums">{seatsAvailable}</span>
            <span className="text-xs text-muted-foreground">seats left</span>
          </div>
        )}
      </RingCenter>
    </RingChart>
  );
}
