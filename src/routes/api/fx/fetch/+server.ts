import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index';
import { fxRates } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const POST: RequestHandler = async () => {
  try {
    // Fetch ECB rates for EUR → major currencies
    const response = await fetch('https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml');
    const xml = await response.text();

    // Parse XML
    const rates: { currency: string; rate: string }[] = [];
    const matches = xml.matchAll(/currency='([A-Z]+)'\s+rate='([0-9.]+)'/g);
    for (const match of matches) {
      rates.push({ currency: match[1], rate: match[2] });
    }

    if (rates.length === 0) {
      return json({ error: 'No rates found in ECB response' }, { status: 500 });
    }

    const today = new Date().toISOString().split('T')[0];
    let inserted = 0;

    for (const r of rates) {
      try {
        await db.insert(fxRates).values({
          fromCurrency: 'EUR',
          toCurrency: r.currency,
          rate: r.rate,
          date: today,
          source: 'ecb',
        });
        inserted++;
      } catch (e) {
        // Skip duplicates (unique constraint on date+from+to)
        if (e.code !== '23505') throw e;
      }
    }

    return json({ ok: true, inserted, total: rates.length, date: today });
  } catch (e) {
    return json({ error: String(e) }, { status: 500 });
  }
};
