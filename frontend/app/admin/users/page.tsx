'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiGetAuth, apiPatchAuth } from '@/lib/api';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Section,
} from '@/app/components/ui';

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
  accountStatus: 'active' | 'suspended';
  suspendedAt: string | null;
  suspensionReason: string | null;
  identityStatus:
    | 'not_started'
    | 'pending'
    | 'needs_review'
    | 'approved'
    | 'failed'
    | 'expired';
};

type UserPage = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = (await apiGetAuth(
        `/admin/users?page=${page}&pageSize=20&query=${encodeURIComponent(query)}`,
      )) as UserPage;
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load users');
    }
  }, [page, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (
    user: AdminUser,
    body: {
      roles?: string[];
      accountStatus?: 'active' | 'suspended';
      suspensionReason?: string;
    },
  ) => {
    setBusyId(user.id);
    setError(null);
    try {
      await apiPatchAuth(`/admin/users/${user.id}`, body);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  const toggleRole = (user: AdminUser, role: 'host' | 'admin') => {
    const roles = user.roles.includes(role)
      ? user.roles.filter((candidate) => candidate !== role)
      : [...user.roles, role];
    void update(user, { roles });
  };

  const suspend = (user: AdminUser) => {
    const reason = window.prompt('Reason for suspension');
    if (!reason?.trim()) return;
    void update(user, {
      accountStatus: 'suspended',
      suspensionReason: reason.trim(),
    });
  };

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    void load();
  };

  const pages = Math.max(1, Math.ceil(total / 20));

  return (
    <Section
      title="Users"
      description="Review account access, roles, identity status, and suspensions."
    >
      <form onSubmit={onSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search email or name"
          className="flex-1"
        />
        <Button variant="secondary" type="submit">Search</Button>
      </form>
      {error && <Alert tone="danger" role="alert">{error}</Alert>}
      <div className="space-y-3">
        {items.map((user) => (
          <Card key={user.id} className="space-y-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-semibold">{user.email}</div>
                <div className="mt-1 text-xs text-muted">
                  {user.name || 'No name'} · {user.roles.join(', ')}
                </div>
                <div className="text-xs text-muted">
                  Identity: {user.identityStatus.replaceAll('_', ' ')}
                </div>
              </div>
              <Badge
                tone={user.accountStatus === 'suspended' ? 'danger' : 'success'}
              >
                {user.accountStatus}
              </Badge>
            </div>
            {user.suspensionReason && (
              <p className="text-xs text-danger">
                Reason: {user.suspensionReason}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busyId === user.id}
                onClick={() => toggleRole(user, 'host')}
              >
                {user.roles.includes('host') ? 'Remove host' : 'Grant host'}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busyId === user.id}
                onClick={() => toggleRole(user, 'admin')}
              >
                {user.roles.includes('admin') ? 'Remove admin' : 'Grant admin'}
              </Button>
              {user.accountStatus === 'active' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={busyId === user.id}
                  onClick={() => suspend(user)}
                >
                  Suspend
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={busyId === user.id}
                  onClick={() => void update(user, { accountStatus: 'active' })}
                >
                  Reactivate
                </Button>
              )}
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <EmptyState title="No users found" description="Try a different search." />
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </Button>
        <span>
          Page {page} / {pages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= pages}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </Button>
      </div>
    </Section>
  );
}
