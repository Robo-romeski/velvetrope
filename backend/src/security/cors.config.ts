export function resolveCorsOrigins(): (string | RegExp)[] {
  const configured = process.env.CORS_ORIGINS?.trim();
  if (configured) {
    return configured
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  if (process.env.NODE_ENV === 'production') {
    const appBase = process.env.APP_BASE_URL?.trim();
    return appBase ? [appBase] : [];
  }

  return [/^http:\/\/localhost:3000$/];
}
