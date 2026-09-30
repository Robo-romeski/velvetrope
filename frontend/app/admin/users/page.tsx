'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiGetAuth, apiPatchAuth } from '@/lib/api';

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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search email or name"
          className="border rounded px-3 py-2 bg-transparent flex-1"
        />
        <button className="px-4 py-2 border rounded" type="submit">
          Search
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-3">
        {items.map((user) => (
          <div key={user.id} className="border rounded p-3 text-sm space-y-2">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <div className="font-medium">{user.email}</div>
                <div className="text-xs text-gray-500">
                  {user.name || 'No name'} · {user.roles.join(', ')}
                </div>
                <div className="text-xs text-gray-500">
                  Identity: {user.identityStatus.replaceAll('_', ' ')}
                </div>
              </div>
              <span
                className={
                  user.accountStatus === 'suspended'
                    ? 'text-red-600'
                    : 'text-green-700 dark:text-green-400'
                }
              >
                {user.accountStatus}
              </span>
            </div>
            {user.suspensionReason && (
              <p className="text-xs text-red-600">
                Reason: {user.suspensionReason}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === user.id}
                onClick={() => toggleRole(user, 'host')}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                {user.roles.includes('host') ? 'Remove host' : 'Grant host'}
              </button>
              <button
                type="button"
                disabled={busyId === user.id}
                onClick={() => toggleRole(user, 'admin')}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                {user.roles.includes('admin') ? 'Remove admin' : 'Grant admin'}
              </button>
              {user.accountStatus === 'active' ? (
                <button
                  type="button"
                  disabled={busyId === user.id}
                  onClick={() => suspend(user)}
                  className="px-2 py-1 border border-red-600 text-red-700 dark:text-red-400 rounded disabled:opacity-50"
                >
                  Suspend
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busyId === user.id}
                  onClick={() => void update(user, { accountStatus: 'active' })}
                  className="px-2 py-1 border rounded disabled:opacity-50"
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-gray-500">No users found.</p>
        )}
      </div>
      <div className="flex items-center gap-3 text-sm">
        <button
          disabled={page <= 1}
          onClick={() => setPage((value) => value - 1)}
          className="px-2 py-1 border rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span>
          Page {page} / {pages}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => setPage((value) => value + 1)}
          className="px-2 py-1 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
