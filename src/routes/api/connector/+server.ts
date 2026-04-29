import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';
import { validateConnector } from '$lib/connector/loader';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const config = await request.json();

    // Validate
    const errors = validateConnector(config);
    if (errors.length > 0) {
      return new Response(JSON.stringify({ error: errors.join('; ') }), { status: 400 });
    }

    // Write connector.json
    const path = join(process.cwd(), 'connector.json');
    writeFileSync(path, JSON.stringify(config, null, 2), 'utf8');

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};
