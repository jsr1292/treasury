import { getAccounts, getBalances, getEntities, getConnectorMode, getCompanyList } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
  const companyIndex = parseInt(cookies.get('company') || '0', 10);
  const isConsolidated = companyIndex === -1;
  const companies = getCompanyList();
  const mode = await getConnectorMode(companyIndex);

  try {
    let allAccounts: any[];
    let allBalances: any[];

    if (isConsolidated) {
      const indices = companies.map((_: any, i: number) => i);
      [allAccounts, allBalances] = await Promise.all([
        Promise.all(indices.map((i: number) => getAccounts(i))).then(r => r.flat()),
        Promise.all(indices.map((i: number) => getBalances(i))).then(r => r.flat()),
      ]);
    } else {
      [allAccounts, allBalances] = await Promise.all([
        getAccounts(companyIndex),
        getBalances(companyIndex),
      ]);
    }

    // Find account by id or name (API mode uses name as id)
    let account: any = null;
    let entity = { name: '—' };

    for (const a of allAccounts) {
      if (String(a.id || a.accountId || a.name || '') === String(params.id)) {
        account = a;
        const eName = a.entityName;
        if (eName) {
          let allEntities: any[];
          if (isConsolidated) {
            const indices = companies.map((_: any, i: number) => i);
            allEntities = await Promise.all(indices.map((i: number) => getEntities(i))).then(r => r.flat());
          } else {
            allEntities = await getEntities(companyIndex);
          }
          const matched = allEntities.find((e: any) =>
            e.name === eName || e.id === eName ||
            (e.name && eName && (e.name.includes(eName) || eName.includes(e.name)))
          );
          if (matched) entity = { name: matched.name };
          else entity = { name: eName };
        }
        break;
      }
    }

    if (!account) {
      return { account: null, entity: { name: '—' }, balances: [], stats: null, anomalies: [], connectorMode: mode };
    }

    const accountId = account.id || account.name || params.id;

    // Filter balances for this account
    const accountBalances = allBalances.filter((b: any) =>
      String(b.accountId || b.account_id || b.id || '') === String(accountId)
    );

    // Sort balances by date descending
    const sortedBalances = [...accountBalances].sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    // Compute stats
    let stats: any = null;
    if (sortedBalances.length > 0) {
      const values = sortedBalances.map((b: any) => parseFloat(b.balance || b.balanceLocal || 0));
      const latestBalance = values[0];
      const minBalance = Math.min(...values);
      const maxBalance = Math.max(...values);
      const avgBalance = values.reduce((s, v) => s + v, 0) / values.length;
      const totalChange = values[0] - values[values.length - 1];
      const totalChangePercent = values[values.length - 1] !== 0
        ? ((values[0] - values[values.length - 1]) / Math.abs(values[values.length - 1])) * 100
        : 0;

      stats = {
        latestBalance,
        avgBalance,
        minBalance,
        maxBalance,
        totalChange,
        totalChangePercent,
        totalEntries: sortedBalances.length,
        firstDate: sortedBalances[sortedBalances.length - 1]?.date,
        lastDate: sortedBalances[0]?.date,
      };
    }

    return { account, entity, balances: sortedBalances, stats, anomalies: [], connectorMode: mode };
  } catch (e) {
    console.error('[AccountDetail] Error:', e);
    return { account: null, entity: { name: '—' }, balances: [], stats: null, anomalies: [], connectorMode: mode };
  }
};
