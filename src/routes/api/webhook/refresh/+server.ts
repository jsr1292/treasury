import type { RequestHandler } from './$types';
import { clearCache } from '$lib/connector/api-connector';

export const POST: RequestHandler = async () => {
  // Clear the API cache
  clearCache();
  
  // Return 200 immediately so the caller knows it worked
  return new Response(JSON.stringify({ ok: true, message: 'Webhook received, cache cleared' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
