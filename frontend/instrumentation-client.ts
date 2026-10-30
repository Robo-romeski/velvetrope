import posthog from 'posthog-js';

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const appLabel =
  process.env.NEXT_PUBLIC_POSTHOG_APP_LABEL?.trim() || 'epicsexual';

function withoutQueryOrFragment(value: unknown) {
  if (typeof value !== 'string' || value.length === 0) return value;

  try {
    const url = new URL(value, window.location.origin);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0];
  }
}

if (projectToken) {
  posthog.init(projectToken, {
    api_host:
      process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    defaults: '2025-11-30',
    person_profiles: 'identified_only',
    persistence: 'memory',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    autocapture: false,
    disable_session_recording: true,
    before_send: (event) => {
      if (!event?.properties) return event;

      event.properties.app = appLabel;

      for (const property of [
        '$current_url',
        '$referrer',
        '$initial_referrer',
      ]) {
        event.properties[property] = withoutQueryOrFragment(
          event.properties[property],
        );
      }

      return event;
    },
  });

  posthog.register({ app: appLabel });
}
