import { getDashboard, getBalanceHistory } from '$lib/server/db/queries';
import { db } from '$lib/server/db/index.js';
import { accounts, balanceEntries, entities } from '$lib/server/db/schema.js';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
  const dash = await getDashboard();

  // Get balance history for the first 5 accounts (for trend charts)
  const chartDays = parseInt(process.env.CHART_HISTORY_DAYS || '90');
  const historyMap: Record<string, { date: string; balance: number; currency: string }[]> = {};
  for (const { account } of dash.balances.slice(0, 5)) {
    historyMap[account.id] = await getBalanceHistory(account.id, chartDays);
  }

  // Investment summary — all deposit and bond accounts
  const investRows = await db
    .select({ account: accounts, entity: entities })
    .from(accounts)
    .innerJoin(entities, eq(accounts.entityId, entities.id))
    .where(eq(accounts.isActive, true));

  const investmentAccounts = investRows.filter(r =>
    r.account.type === 'deposit' || r.account.type === 'bond'
  );

  const enrichedInvestments = [];
  for (const { account, entity } of investmentAccounts) {
    const [latest] = await db.select()
      .from(balanceEntries)
      .where(eq(balanceEntries.accountId, account.id))
      .orderBy(desc(balanceEntries.date))
      .limit(1);

    const daysToMaturity = account.maturityDate
      ? Math.ceil((new Date(account.maturityDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    enrichedInvestments.push({
      account,
      entity,
      latestBalance: latest || null,
      balance: latest ? parseFloat(latest.balance) : 0,
      daysToMaturity,
    });
  }

  // Sort by nearest maturity
  enrichedInvestments.sort((a, b) => (a.daysToMaturity ?? 99999) - (b.daysToMaturity ?? 99999));

  // Compute totals
  const totalInvested = enrichedInvestments.reduce((sum, i) => sum + i.balance, 0);
  const weightedRate = enrichedInvestments.reduce((sum, i) => {
    const rate = i.account.interestRate ? parseFloat(i.account.interestRate) : 0;
    return sum + rate * i.balance;
  }, 0) / (totalInvested || 1);

  return {
    ...dash,
    chartDays,
    historyMap,
    investments: {
      accounts: enrichedInvestments,
      total: totalInvested,
      avgRate: enrichedInvestments.length > 0 ? weightedRate : 0,
      count: enrichedInvestments.length,
    },
  };
};
