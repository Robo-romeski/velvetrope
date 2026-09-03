export const buildRemoteJwks = (issuerUrl: string) => {
  // Lazy-load jose at runtime to avoid ESM/CommonJS issues
  return {
    async getKey(...args: any[]) {
      const { createRemoteJWKSet } = await import('jose');
      const url = new URL('/.well-known/jwks.json', issuerUrl);
      const jwks = createRemoteJWKSet(url);
      return jwks(...args);
    },
  } as unknown as ReturnType<typeof import('jose').createRemoteJWKSet>;
};
