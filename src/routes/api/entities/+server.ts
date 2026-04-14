import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createEntity } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { name, type, parentId, country, currency, taxId } = body;

  if (!name) return json({ error: 'Name is required' }, { status: 400 });

  try {
    const entity = await createEntity({ name, type, parentId, country, currency, taxId });
    return json(entity);
  } catch (e) {
    return json({ error: 'Failed to create entity' }, { status: 500 });
  }
};
