import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
  additionalPrecacheEntries: [{ url: '/~offline', revision: '1' }],
});

export default withSerwist(nextConfig);
