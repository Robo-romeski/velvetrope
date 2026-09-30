import 'server-only';

export const API_SERVER_BASE =
  process.env.API_SERVER_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3010';
