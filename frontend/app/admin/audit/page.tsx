'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';
import {
  Alert,
  Card,
  EmptyState,
  Section,
} from '@/app/components/ui';

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
    <Section
      title="Admin audit log"
      description="Immutable records of administrative user, event, and report actions."
    >
      {error && <Alert tone="danger" role="alert">{error}</Alert>}
      <div className="space-y-2">
        {items.map((entry) => (
          <Card key={entry.id} className="space-y-1 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{entry.action}</strong>
              <span className="text-xs text-muted">
                {new Date(entry.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-muted">
              Actor {entry.actorSub} · {entry.targetType} {entry.targetId}
            </div>
            {entry.metadata && (
              <pre className="overflow-auto whitespace-pre-wrap border border-border bg-surface-subtle p-3 text-xs">
                {JSON.stringify(JSON.parse(entry.metadata), null, 2)}
              </pre>
            )}
          </Card>
        ))}
        {items.length === 0 && (
          <EmptyState
            title="No admin actions recorded"
            description="Administrative changes will appear here."
          />
        )}
      </div>
    </Section>
  );
}
