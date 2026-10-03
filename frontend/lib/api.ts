export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3010';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getApiStatus(error: unknown) {
  return error instanceof ApiError ? error.status : null;
}

export function isUnauthorized(error: unknown) {
  return getApiStatus(error) === 401 ||
    (error instanceof Error && error.message === 'Unauthorized');
}

function fallbackMessage(status: number) {
  if (status === 401) return 'Log in to continue.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'We could not find what you requested.';
  if (status >= 500) return 'The service is temporarily unavailable. Please try again.';
  return 'We could not complete that request. Please try again.';
}

async function responseMessage(response: Response) {
  const data = await response.json().catch(() => null);
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallbackMessage(response.status);
}

async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  init?: RequestInit,
) {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      method,
      ...(body === undefined ? {} : { body: JSON.stringify(body ?? {}) }),
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      cache: method === 'GET' ? 'no-store' : init?.cache,
    });
  } catch {
    throw new ApiError(
      'Unable to reach the service. Check your connection and try again.',
      0,
    );
  }

  if (!response.ok) {
    throw new ApiError(await responseMessage(response), response.status);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function getAccessTokenClient(): Promise<string> {
  const res = await fetch('/api/token', { cache: 'no-store' });
  if (!res.ok) throw new ApiError('Log in to continue.', res.status);
  const data = await res.json();
  if (!data?.accessToken) throw new ApiError('Log in to continue.', 401);
  return data.accessToken as string;
}

export async function apiGet(path: string, init?: RequestInit) {
  return apiRequest('GET', path, undefined, init);
}

export async function apiPut(path: string, body: unknown, init?: RequestInit) {
  return apiRequest('PUT', path, body, init);
}

export async function apiPost(path: string, body: unknown, init?: RequestInit) {
  return apiRequest('POST', path, body, init);
}

export async function apiPatch(path: string, body: unknown, init?: RequestInit) {
  return apiRequest('PATCH', path, body, init);
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

export async function apiDeleteAuth(path: string) {
  const token = await getAccessTokenClient();
  return apiRequest('DELETE', path, undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
}


