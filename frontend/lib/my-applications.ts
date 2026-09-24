'use client';

import { useEffect, useState } from 'react';
import { apiGetAuth } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export function useMyApplicationByEvent() {
  const { user, loading: authLoading } = useAuth();
  const [byEventId, setByEventId] = useState<Map<string, ApplicationStatus>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) {
      setByEventId(new Map());
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGetAuth('/applications/mine');
        const map = new Map<string, ApplicationStatus>();
        for (const item of data?.items ?? []) {
          if (item?.eventId && item?.status) {
            map.set(item.eventId as string, item.status as ApplicationStatus);
          }
        }
        if (mounted) setByEventId(map);
      } catch {
        if (mounted) setByEventId(new Map());
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  const getStatus = (eventId: string) => byEventId.get(eventId);

  return {
    getStatus,
    loading: authLoading || loading,
    loggedIn: !!user && !authLoading,
  };
}
