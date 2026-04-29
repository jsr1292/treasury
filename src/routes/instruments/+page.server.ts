import { getAccounts, getConnectorMode } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const mode = await getConnectorMode();
  if (mode !== 'database') {
    return { instruments: [], totalDeposits: 0, totalBonds: 0, totalYield: 0, connectorMode: mode };
  }
  try {
    const { db } = await import('$lib/server/db/index');
    const { accounts, entities, balanceEntries } = await import('$lib/server/db/schema');
    const { eq, desc, or } = await import('drizzle-orm');

    const instruments = await db.select({
      account: accounts,
      entity: entities,
    })
      .from(accounts)
      .innerJoin(entities, eq(accounts.entityId, entities.id))
      .where(or(eq(accounts.type, 'deposit'), eq(accounts.type, 'bond')))
      .orderBy(desc(accounts.maturityDate));

    const enriched = await Promise.all(instruments.map(async (item) => {
      const [latest] = await db.select().from(balanceEntries)
        .where(eq(balanceEntries.accountId, item.account.id))
        .orderBy(desc(balanceEntries.date))
        .limit(1);

      const maturity = item.account.maturityDate ? new Date(item.account.maturityDate) : null;
      const daysToMaturity = maturity ? Math.ceil((maturity.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
      const isMatured = daysToMaturity !== null && daysToMaturity <= 0;
      const isNearMaturity = daysToMaturity !== null && daysToMaturity > 0 && daysToMaturity <= 30;

      const balance = latest ? parseFloat(latest.balance) : 0;
      const rate = item.account.interestRate ? parseFloat(item.account.interestRate) : 0;
      const annualYield = balance * (rate / 100);
      const dailyYield = annualYield / 365;

      return { ...item, latestBalance: latest, daysToMaturity, isMatured, isNearMaturity, annualYield, dailyYield };
    }));

    const totalDeposits = enriched.filter(i => i.account.type === 'deposit')
      .reduce((sum, i) => sum + (i.latestBalance ? parseFloat(i.latestBalance.balance) : 0), 0);
    const totalBonds = enriched.filter(i => i.account.type === 'bond')
      .reduce((sum, i) => sum + (i.latestBalance ? parseFloat(i.latestBalance.balance) : 0), 0);
    const totalYield = enriched.reduce((sum, i) => sum + i.annualYield, 0);

    return { instruments: enriched, totalDeposits, totalBonds, totalYield, connectorMode: mode };
  } catch {
    return { instruments: [], totalDeposits: 0, totalBonds: 0, totalYield: 0, connectorMode: mode };
  }
};
