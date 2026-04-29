import type { RequestHandler } from './$types';
import { clearCache } from '$lib/connector/api-connector';

export const POST: RequestHandler = async () => {
  clearCache();
  return new Response(JSON.stringify({ ok: true, message: 'Cache cleared' }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
