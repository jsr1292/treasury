import { getConnectorMode, getEntities, getAccounts, getBalances, getDashboard, getCompanyList } from '$lib/server/data';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ cookies }) => {
  const companyIndex = parseInt(cookies.get('company') || '0', 10);
  const mode = await getConnectorMode(companyIndex);
  const companies = getCompanyList();
  const isConsolidated = companyIndex === -1;

  if (mode === 'api') {
    if (isConsolidated) {
      const indices = companies.map((_: any, i: number) => i);
      const [entities, accounts, balances] = await Promise.all([
        Promise.all(indices.map((i: number) => getEntities(i))).then(r => r.flat()),
        Promise.all(indices.map((i: number) => getAccounts(i))).then(r => r.flat()),
        Promise.all(indices.map((i: number) => getBalances(i))).then(r => r.flat()),
      ]);

      return buildDashboardData(entities, accounts, balances, mode, companies, true);
    }

    const [entities, accounts, balances] = await Promise.all([
      getEntities(companyIndex),
      getAccounts(companyIndex),
      getBalances(companyIndex),
    ]);

    return buildDashboardData(entities, accounts, balances, mode, companies, false);
  }

  // Database mode
  const { getDashboard: dbGetDashboard } = await import('$lib/server/data');
  const { isDatabaseAvailable } = await import('$lib/server/data');
  const dash = await dbGetDashboard();

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
        companies,
        selectedCompany: companies[companyIndex] || { name: 'Company', index: 0 },
        isConsolidated: false,
        entityComparison: [],
        summaryStats: {},
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
    companies,
    selectedCompany: companies[companyIndex] || { name: 'Company', index: 0 },
    isConsolidated: false,
    entityComparison: [],
    summaryStats: {},
  };
};

function buildDashboardData(entities: any[], accounts: any[], balances: any[], mode: string, companies: any[], isConsolidated: boolean) {
  const balanceMap = new Map<string, any>();
  for (const b of balances) {
    const key = String(b.accountId || b.account_id || b.id || '');
    if (key) balanceMap.set(key, b);
  }

  const totalsByCurrency: Record<string, number> = {};
  const enrichedAccounts: any[] = [];

  for (const acct of accounts) {
    const acctKey = String(acct.id || acct.accountId || acct.name || '');
    const bal = balanceMap.get(acctKey);
    const balance = bal ? parseFloat(bal.balance || bal.balanceLocal || 0) : 0;
    const currency = acct.currency || bal?.currency || 'EUR';

    totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + balance;

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

  // Entity comparison: sum balances by entity
  const entityTotals: Record<string, { name: string; total: number; currency: string; accountCount: number }> = {};
  for (const { account, entity, latestBalance } of enrichedAccounts) {
    const eName = entity.name || 'Unknown';
    if (!entityTotals[eName]) {
      entityTotals[eName] = { name: eName, total: 0, currency: account.currency || 'EUR', accountCount: 0 };
    }
    if (latestBalance) {
      entityTotals[eName].total += latestBalance.balance;
      entityTotals[eName].accountCount++;
    }
  }

  const entityComparison = Object.values(entityTotals)
    .filter(e => e.accountCount > 0)
    .sort((a, b) => b.total - a.total);

  // Summary stats
  const allBalances = enrichedAccounts
    .filter(a => a.latestBalance)
    .map(a => a.latestBalance.balance);

  const totalBalance = allBalances.reduce((s, v) => s + v, 0);
  const maxBalance = allBalances.length > 0 ? Math.max(...allBalances) : 0;
  const minBalance = allBalances.length > 0 ? Math.min(...allBalances) : 0;
  const banks = new Set(accounts.map((a: any) => a.bankName).filter(Boolean)).size;
  const uniqueEntities = new Set(entities.map((e: any) => e.name).filter(Boolean)).size;

  const summaryStats = {
    totalBalance,
    maxBalance,
    minBalance,
    entityCount: uniqueEntities,
    accountCount: accounts.length,
    bankCount: banks,
  };

  return {
    balances: enrichedAccounts,
    entities,
    totalsByCurrency,
    anomalies: [],
    connectorMode: mode,
    chartDays: 90,
    historyMap: {},
    investments: { accounts: [], total: 0, avgRate: 0, count: 0 },
    companies,
    selectedCompany: companies[0] || { name: 'Company', index: 0 },
    isConsolidated,
    entityComparison,
    summaryStats,
  };
}
