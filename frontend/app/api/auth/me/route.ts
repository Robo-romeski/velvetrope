import { cookies } from 'next/headers';
import { API_BASE } from '@/lib/api';
import { ACCESS_TOKEN_COOKIE } from '@/lib/session';

export async function GET() {
  const jar = await cookies();
  const token = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    return new Response('Unauthorized', { status: 401 });
  }
  const user = await res.json();
  return Response.json(user);
}
