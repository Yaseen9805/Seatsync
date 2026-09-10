'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-sm text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
    >
      {deleting ? 'Deleting…' : 'Delete'}
    </button>
  );
}
