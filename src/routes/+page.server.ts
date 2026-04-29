import { getConnectorMode, getEntities, getAccounts, getBalances } from '$lib/server/data';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
  const mode = await getConnectorMode();

  if (mode === 'api') {
    // API mode: fetch entities, accounts, balances and compute totals
    const [entities, accounts, balances] = await Promise.all([
      getEntities(),
      getAccounts(),
      getBalances(),
    ]);

    // Build balance map keyed by account id
    const balanceMap = new Map<string, any>();
    for (const b of balances) {
      const key = String(b.accountId || b.account_id || b.id || '');
      if (key) balanceMap.set(key, b);
    }

    // Compute totals by currency
    const totalsByCurrency: Record<string, number> = {};
    const enrichedAccounts: any[] = [];

    for (const acct of accounts) {
      const acctKey = String(acct.id || acct.accountId || acct.name || '');
      const bal = balanceMap.get(acctKey);
      const balance = bal ? parseFloat(bal.balance || bal.balanceLocal || 0) : 0;
      const currency = acct.currency || bal?.currency || 'EUR';

      totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + balance;

      // Find entity name
      const entityName = acct.entityName || '—';
      const matchedEntity = entities.find((e: any) =>
        e.name === entityName || e.id === entityName ||
        (e.name && entityName && (e.name.includes(entityName) || entityName.includes(e.name)))
      );

      enrichedAccounts.push({
        account: { ...acct, currency },
        entity: { name: matchedEntity?.name || entityName },
        latestBalance: bal ? { balance, date: bal.date, currency } : null,
      });
    }

    return {
      balances: enrichedAccounts,
      entities,
      totalsByCurrency,
      anomalies: [],
      connectorMode: mode,
      chartDays: 90,
      historyMap: {},
      investments: { accounts: [], total: 0, avgRate: 0, count: 0 },
    };
  }

  // Database mode
  const { getDashboard } = await import('$lib/server/data');
  const { isDatabaseAvailable } = await import('$lib/server/data');
  const dash = await getDashboard();

  let investments = { accounts: [], total: 0, avgRate: 0, count: 0 };

  if (mode === 'database' && isDatabaseAvailable()) {
    try {
      const { db } = await import('$lib/server/db/index.js');
      const { accounts, balanceEntries, entities } = await import('$lib/server/db/schema.js');
      const { desc, eq } = await import('drizzle-orm');
      const { getBalanceHistory } = await import('$lib/server/db/queries');

      const chartDays = parseInt(process.env.CHART_HISTORY_DAYS || '90');
      const historyMap: Record<string, { date: string; balance: number; currency: string }[]> = {};
      for (const b of (dash.balances || []).slice(0, 5)) {
        const acct = b.account || b;
        if (acct?.id) historyMap[acct.id] = await getBalanceHistory(acct.id, chartDays);
      }

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

      enrichedInvestments.sort((a, b) => (a.daysToMaturity ?? 99999) - (b.daysToMaturity ?? 99999));
      const totalInvested = enrichedInvestments.reduce((sum, i) => sum + i.balance, 0);
      const weightedRate = enrichedInvestments.reduce((sum, i) => {
        const rate = i.account.interestRate ? parseFloat(i.account.interestRate) : 0;
        return sum + rate * i.balance;
      }, 0) / (totalInvested || 1);

      investments = {
        accounts: enrichedInvestments,
        total: totalInvested,
        avgRate: enrichedInvestments.length > 0 ? weightedRate : 0,
        count: enrichedInvestments.length,
      };

      return {
        ...dash,
        connectorMode: mode,
        chartDays,
        historyMap,
        investments,
      };
    } catch (e) {
      console.error('[Dashboard] DB query failed:', e);
    }
  }

  return {
    ...dash,
    connectorMode: mode,
    chartDays: 90,
    historyMap: {},
    investments,
  };
};
