/// <reference lib="webworker" />

import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import {
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
} from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) =>
        url.origin === self.location.origin &&
        (url.pathname.startsWith('/api/') ||
          url.pathname.startsWith('/admin/') ||
          url.pathname.startsWith('/host/')),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url, request }) =>
        url.origin === self.location.origin &&
        request.mode === 'navigate' &&
        /^\/events\/[^/]+\/ticket$/.test(url.pathname),
      handler: new NetworkFirst({
        cacheName: 'velvetkey-ticket-pages',
        networkTimeoutSeconds: 3,
        plugins: [
          new ExpirationPlugin({
            maxEntries: 20,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document';
        },
      },
    ],
  },
});

serwist.addEventListeners();
