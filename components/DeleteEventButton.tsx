'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function DeleteEventButton({ eventId, title }: { eventId: string; title: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
    setDeleting(false);
    router.refresh();
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
      {deleting ? 'Deleting…' : 'Delete'}
    </Button>
  );
}
