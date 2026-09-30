'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';

type AuditEntry = {
  id: string;
  actorSub: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: string | null;
  createdAt: string;
};

export default function AdminAuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await apiGetAuth('/admin/audit?limit=200');
        if (mounted) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Could not load audit log');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin audit log</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Immutable records of administrative user, event, and report actions.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-2">
        {items.map((entry) => (
          <div key={entry.id} className="border rounded p-3 text-sm space-y-1">
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{entry.action}</strong>
              <span className="text-xs text-gray-500">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              Actor {entry.actorSub} · {entry.targetType} {entry.targetId}
            </div>
            {entry.metadata && (
              <pre className="text-xs whitespace-pre-wrap overflow-auto">
                {JSON.stringify(JSON.parse(entry.metadata), null, 2)}
              </pre>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No admin actions recorded.</p>
        )}
      </div>
    </div>
  );
}
