import { db } from '$lib/server/db/index';
import { accounts, entities, balanceEntries, anomalies } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const accountId = params.id;

  // Get account with entity info
  const [row] = await db.select({
    account: accounts,
    entity: entities,
  })
    .from(accounts)
    .innerJoin(entities, eq(accounts.entityId, entities.id))
    .where(eq(accounts.id, accountId));

  if (!row) return { account: null, entity: null, balances: [], anomalies: [] };

  // Get balance history (last 60 entries)
  const balances = await db.select().from(balanceEntries)
    .where(eq(balanceEntries.accountId, accountId))
    .orderBy(desc(balanceEntries.date))
    .limit(60);

  // Get anomalies for this account
  const accountAnomalies = [];
  for (const bal of balances) {
    const anoms = await db.select().from(anomalies)
      .where(eq(anomalies.balanceEntryId, bal.id));
    accountAnomalies.push(...anoms);
  }

  // Calculate stats
  let totalChange = 0;
  let maxBalance = 0;
  let minBalance = Infinity;
  let prevBalance = null;

  for (const b of [...balances].reverse()) {
    const val = parseFloat(b.balance);
    if (val > maxBalance) maxBalance = val;
    if (val < minBalance) minBalance = val;
    if (prevBalance !== null) totalChange += val - prevBalance;
    prevBalance = val;
  }

  const stats = {
    totalEntries: balances.length,
    totalChange,
    maxBalance,
    minBalance: minBalance === Infinity ? 0 : minBalance,
    latestBalance: balances[0] ? parseFloat(balances[0].balance) : 0,
    firstDate: balances.length > 0 ? balances[balances.length - 1].date : null,
    lastDate: balances.length > 0 ? balances[0].date : null,
  };

  return { account: row.account, entity: row.entity, balances, anomalies: accountAnomalies, stats };
};
