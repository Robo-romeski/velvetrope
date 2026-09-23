import { cookies } from 'next/headers';
import { API_BASE } from '@/lib/api';
import { ACCESS_TOKEN_COOKIE, sessionCookieOptions } from '@/lib/session';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return Response.json(data, { status: res.status });
  }
  const jar = await cookies();
  jar.set(ACCESS_TOKEN_COOKIE, data.token, sessionCookieOptions);
  return Response.json({ user: data.user });
}
