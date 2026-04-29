import { getBalances, getAccounts, getEntities, getConnectorMode, getCompanyList } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const companyIndex = parseInt(cookies.get('company') || '0', 10);
  const isConsolidated = companyIndex === -1;
  const companies = getCompanyList();
  const mode = await getConnectorMode(companyIndex);

  try {
    let balances: any[];
    let accounts: any[];
    let entities: any[];

    if (isConsolidated) {
      const indices = companies.map((_: any, i: number) => i);
      [balances, accounts, entities] = await Promise.all([
        Promise.all(indices.map((i: number) => getBalances(i))).then(r => r.flat()),
        Promise.all(indices.map((i: number) => getAccounts(i))).then(r => r.flat()),
        Promise.all(indices.map((i: number) => getEntities(i))).then(r => r.flat()),
      ]);
    } else {
      [balances, accounts, entities] = await Promise.all([
        getBalances(companyIndex),
        getAccounts(companyIndex),
        getEntities(companyIndex),
      ]);
    }

    // Build lookup maps
    const accountMap = new Map(accounts.map((a: any) => [String(a.id || a.accountId || a.name || ''), a]));
    const entityMap = new Map(entities.map((e: any) => [String(e.id || e.name || ''), e]));

    const enrichedBalances = balances.map((b: any) => {
      const acctKey = String(b.accountId || b.account_id || b.id || '');
      const acct = accountMap.get(acctKey) || {};
      const entityName = acct.entityName || b.entityName || '—';
      const matchedEntity = entities.find((e: any) =>
        e.name === entityName || e.id === entityName
      );
      const entity = matchedEntity || { name: entityName };

      return {
        date: b.date,
        accountName: acct.name || acctKey,
        entityName: entity.name || entityName,
        bankName: acct.bankName || b.bankName || '',
        currency: acct.currency || b.currency || 'EUR',
        balance: parseFloat(b.balance || b.balanceLocal || 0),
        balanceLocal: b.balanceLocal || '',
      };
    });

    // Sort by date descending
    enrichedBalances.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { balances: enrichedBalances, connectorMode: mode, isConsolidated };
  } catch (e) {
    console.error('[Balances] Error:', e);
    return { balances: [], connectorMode: mode, isConsolidated };
  }
};
