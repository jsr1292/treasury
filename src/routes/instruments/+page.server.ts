import { getAccounts, getBalances, getConnectorMode } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const mode = await getConnectorMode();

  if (mode !== 'database') {
    // API mode: return deposit/bond accounts from API data
    try {
      const [accounts, balances] = await Promise.all([getAccounts(), getBalances()]);

      const balanceMap = new Map<string, any>();
      for (const b of balances) {
        const key = String(b.accountId || b.account_id || b.id || '');
        if (key) balanceMap.set(key, b);
      }

      // Filter to only deposit and bond accounts
      const instruments = accounts
        .filter((a: any) => a.type === 'deposit' || a.type === 'bond')
        .map((a: any) => {
          const key = String(a.id || a.accountId || a.name || '');
          const bal = balanceMap.get(key);
          const balance = bal ? parseFloat(bal.balance || bal.balanceLocal || 0) : 0;
          const maturity = a.maturityDate ? new Date(a.maturityDate) : null;
          const daysToMaturity = maturity
            ? Math.ceil((maturity.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
          const isMatured = daysToMaturity !== null && daysToMaturity <= 0;
          const isNearMaturity = daysToMaturity !== null && daysToMaturity > 0 && daysToMaturity <= 30;
          const rate = a.interestRate ? parseFloat(a.interestRate) : 0;
          const annualYield = balance * (rate / 100);
          const dailyYield = annualYield / 365;

          return {
            account: { ...a, latestBalance: bal ? { balance } : null },
            entity: { name: a.entityName || '—' },
            latestBalance: bal ? { balance } : null,
            daysToMaturity,
            isMatured,
            isNearMaturity,
            annualYield,
            dailyYield,
          };
        });

      const totalDeposits = instruments
        .filter(i => i.account.type === 'deposit')
        .reduce((sum, i) => sum + (i.latestBalance ? parseFloat(i.latestBalance.balance) : 0), 0);
      const totalBonds = instruments
        .filter(i => i.account.type === 'bond')
        .reduce((sum, i) => sum + (i.latestBalance ? parseFloat(i.latestBalance.balance) : 0), 0);
      const totalYield = instruments.reduce((sum, i) => sum + i.annualYield, 0);

      return { instruments, totalDeposits, totalBonds, totalYield, connectorMode: mode };
    } catch {
      return { instruments: [], totalDeposits: 0, totalBonds: 0, totalYield: 0, connectorMode: mode };
    }
  }

  try {
    const { db } = await import('$lib/server/db/index');
    const { accounts, entities, balanceEntries } = await import('$lib/server/db/schema');
    const { eq, desc, or } = await import('drizzle-orm');

    const instrumentRows = await db.select({
      account: accounts,
      entity: entities,
    })
      .from(accounts)
      .innerJoin(entities, eq(accounts.entityId, entities.id))
      .where(or(eq(accounts.type, 'deposit'), eq(accounts.type, 'bond')))
      .orderBy(desc(accounts.maturityDate));

    const enriched = await Promise.all(instrumentRows.map(async (item) => {
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
