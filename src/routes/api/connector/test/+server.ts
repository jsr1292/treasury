import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const config = await request.json();

    if (!config.entities?.url) {
      return new Response(JSON.stringify({ ok: false, message: 'Entities URL is required', latencyMs: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const start = Date.now();

    // Build headers
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (config.auth?.type === 'bearer' && config.auth.token) {
      headers['Authorization'] = `Bearer ${config.auth.token}`;
    } else if (config.auth?.type === 'basic' && config.auth.username) {
      headers['Authorization'] = `Basic ${Buffer.from(`${config.auth.username}:${config.auth.password || ''}`).toString('base64')}`;
    } else if (config.auth?.type === 'api-key' && config.auth.apiKey) {
      headers[config.auth.headerName || 'X-API-Key'] = config.auth.apiKey;
    }

    const timeout = config.timeout || 15000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    const res = await fetch(config.entities.url, { headers, signal: controller.signal });
    clearTimeout(timer);

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return new Response(JSON.stringify({
        ok: false,
        message: `HTTP ${res.status}: ${res.statusText}`,
        latencyMs,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    const json = await res.json();

    // Try to extract data using dataPath
    let data = json;
    if (config.entities.dataPath) {
      for (const part of config.entities.dataPath.split('.')) {
        data = data?.[part];
      }
    }

    const count = Array.isArray(data) ? data.length : (data ? 1 : 0);

    return new Response(JSON.stringify({
      ok: true,
      message: `Connected — ${count} entit${count === 1 ? 'y' : 'ies'} found`,
      latencyMs,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({
      ok: false,
      message: e.name === 'AbortError' ? 'Connection timed out' : e.message,
      latencyMs: 0,
    }), { headers: { 'Content-Type': 'application/json' } });
  }
};
