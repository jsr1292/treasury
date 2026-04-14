import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createBalanceEntry } from '$lib/server/db/queries';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { accountId, date, balance, currency, balanceEur, fxRate, notes } = body;

  if (!accountId || !date || !balance) return json({ error: 'Account, date, and balance are required' }, { status: 400 });

  try {
    const entry = await createBalanceEntry({ accountId, date, balance: String(balance), currency: currency || 'EUR', balanceEur, fxRate, notes });
    return json(entry);
  } catch (e) {
    return json({ error: 'Failed to create balance entry' }, { status: 500 });
  }
};
