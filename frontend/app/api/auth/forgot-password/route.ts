import { API_SERVER_BASE } from '@/lib/server-api';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${API_SERVER_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return Response.json(data, { status: res.status });
}
