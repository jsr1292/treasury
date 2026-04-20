import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Initialize locals — AUTH_MODE=none means all requests are unauthenticated guests
  // Pages that need auth check locals.user themselves
  event.locals.user = null;

  return resolve(event);
};
