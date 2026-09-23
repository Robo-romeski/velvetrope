import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE } from '@/lib/session';

export async function GET() {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!accessToken) {
    return new Response('Unauthorized', { status: 401 });
  }
  return Response.json({ accessToken });
}
