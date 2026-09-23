import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from '@/lib/session';

export async function POST() {
  const jar = await cookies();
  jar.delete(ACCESS_TOKEN_COOKIE);
  return Response.json({ ok: true });
}
