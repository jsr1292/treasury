import { db } from '$lib/server/db/index';
import { accounts, entities, balanceEntries } from '$lib/server/db/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Get all deposit and bond accounts with entity info
  const instruments = await db.select({
    account: accounts,
    entity: entities,
  })
    .from(accounts)
    .innerJoin(entities, eq(accounts.entityId, entities.id))
    .where(or(eq(accounts.type, 'deposit'), eq(accounts.type, 'bond')))
    .orderBy(desc(accounts.maturityDate));

  // Enrich with latest balance and days to maturity
  const enriched = await Promise.all(instruments.map(async (item) => {
    const [latest] = await db.select().from(balanceEntries)
      .where(eq(balanceEntries.accountId, item.account.id))
      .orderBy(desc(balanceEntries.date))
      .limit(1);

    const maturity = item.account.maturityDate ? new Date(item.account.maturityDate) : null;
    const daysToMaturity = maturity ? Math.ceil((maturity.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    const isMatured = daysToMaturity !== null && daysToMaturity <= 0;
    const isNearMaturity = daysToMaturity !== null && daysToMaturity > 0 && daysToMaturity <= 30;

    // Calculate yield if we have balance and rate
    const balance = latest ? parseFloat(latest.balance) : 0;
    const rate = item.account.interestRate ? parseFloat(item.account.interestRate) : 0;
    const annualYield = balance * (rate / 100);
    const dailyYield = annualYield / 365;

    return {
      ...item,
      latestBalance: latest,
      daysToMaturity,
      isMatured,
      isNearMaturity,
      annualYield,
      dailyYield,
    };
  }));

  // Totals
  const totalDeposits = enriched.filter(i => i.account.type === 'deposit')
    .reduce((sum, i) => sum + (i.latestBalance ? parseFloat(i.latestBalance.balance) : 0), 0);
  const totalBonds = enriched.filter(i => i.account.type === 'bond')
    .reduce((sum, i) => sum + (i.latestBalance ? parseFloat(i.latestBalance.balance) : 0), 0);
  const totalYield = enriched.reduce((sum, i) => sum + i.annualYield, 0);

  return { instruments: enriched, totalDeposits, totalBonds, totalYield };
};
