import { getAccessToken } from '@auth0/nextjs-auth0';

export async function GET() {
  try {
    const result = await getAccessToken();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const accessToken = (result as any)?.accessToken || result;
    if (!accessToken) {
      return new Response('Unauthorized', { status: 401 });
    }
    return Response.json({ accessToken });
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
}


