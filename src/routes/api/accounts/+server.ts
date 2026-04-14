import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createAccount } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { entityId, name, type, currency, accountNumber, bankName, maturityDate, interestRate } = body;

  if (!entityId || !name || !type) return json({ error: 'Entity, name, and type are required' }, { status: 400 });

  try {
    const account = await createAccount({ entityId, name, type, currency, accountNumber, bankName, maturityDate, interestRate });
    return json(account);
  } catch (e) {
    return json({ error: 'Failed to create account' }, { status: 500 });
  }
};
