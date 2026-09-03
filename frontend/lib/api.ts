const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3010';

async function getAccessTokenClient(): Promise<string> {
  const res = await fetch('/api/token', { cache: 'no-store' });
  if (!res.ok) throw new Error('Unauthorized');
  const data = await res.json();
  if (!data?.accessToken) throw new Error('Unauthorized');
  return data.accessToken as string;
}

export async function apiGet(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPut(path: string, body: unknown, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    body: JSON.stringify(body ?? {}),
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path: string, body: unknown, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiPatch(path: string, body: unknown, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    body: JSON.stringify(body ?? {}),
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

export async function apiGetAuth(path: string) {
  const token = await getAccessTokenClient();
  return apiGet(path, { headers: { Authorization: `Bearer ${token}` } });
}

export async function apiPostAuth(path: string, body: unknown) {
  const token = await getAccessTokenClient();
  return apiPost(path, body, { headers: { Authorization: `Bearer ${token}` } });
}

export async function apiPutAuth(path: string, body: unknown) {
  const token = await getAccessTokenClient();
  return apiPut(path, body, { headers: { Authorization: `Bearer ${token}` } });
}

export async function apiPatchAuth(path: string, body: unknown) {
  const token = await getAccessTokenClient();
  return apiPatch(path, body, { headers: { Authorization: `Bearer ${token}` } });
}


