import { db } from '$lib/server/db/index';
import { fxRates } from '$lib/server/db/schema';
import { desc, eq, and, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Get latest rates
  const rates = await db.select().from(fxRates)
    .orderBy(desc(fxRates.date))
    .limit(50);

  // Get unique currencies
  const currencies = [...new Set(rates.map(r => r.fromCurrency))];

  return { rates, currencies };
};
