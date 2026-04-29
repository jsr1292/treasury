import { getBalances, getAccounts, getEntities, getConnectorMode } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const mode = await getConnectorMode();
  try {
    const [balances, accounts, entities] = await Promise.all([
      getBalances(),
      getAccounts(),
      getEntities(),
    ]);

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

    return { balances: enrichedBalances, connectorMode: mode };
  } catch (e) {
    console.error('[Balances] Error:', e);
    return { balances: [], connectorMode: mode };
  }
};
