import { db } from '$lib/server/db/index.js';
import { fxRates, anomalies, accounts, balanceEntries } from '$lib/server/db/schema.js';
import { desc, eq } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async () => {
  // FX rates — latest for each currency pair
  const latestFx = await db
    .select({
      base: fxRates.fromCurrency,
      quote: fxRates.toCurrency,
      rate: fxRates.rate,
    })
    .from(fxRates)
    .orderBy(desc(fxRates.date))
    .limit(6);

  // Unresolved anomalies with account name
  const recentAnomalies = await db
    .select({
      id: anomalies.id,
      type: anomalies.type,
      severity: anomalies.severity,
      message: anomalies.message,
      createdAt: anomalies.createdAt,
      accountName: accounts.name,
    })
    .from(anomalies)
    .leftJoin(balanceEntries, eq(anomalies.balanceEntryId, balanceEntries.id))
    .leftJoin(accounts, eq(balanceEntries.accountId, accounts.id))
    .where(eq(anomalies.isResolved, false))
    .orderBy(desc(anomalies.createdAt))
    .limit(5);

  return {
    fxRates: latestFx,
    anomalies: recentAnomalies,
  };
};
