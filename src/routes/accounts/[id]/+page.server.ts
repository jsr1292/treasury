import { getAccounts, getBalances, getConnectorMode } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const mode = await getConnectorMode();
  try {
    const [allAccounts, allBalances] = await Promise.all([getAccounts(), getBalances()]);
    
    // Find account by id or name (API mode uses name as id)
    let account = null;
    let entity = { name: '—' };
    for (const a of allAccounts) {
      if (a.id === params.id || a.name === params.id || a.account?.name === params.id) {
        if (a.account) {
          // DB format
          account = a.account;
          entity = a.entity || entity;
        } else {
          // API format (flat)
          account = a;
          // Match entity by entityName — try exact, then partial
          const eName = a.entityName;
          if (eName) {
            // First try to find entities
            const entities = await getEntities();
            const matched = entities.find((e) => e.name === eName || e.id === eName)
              || entities.find((e) => e.name?.includes(eName) || eName.includes(e.name));
            if (matched) entity = { name: matched.name };
            else entity = { name: eName };
          }
        }
        break;
      }
    }

    const accountId = account?.id || account?.name || params.id;
    const accountBalances = allBalances.filter((b) => 
      String(b.accountId || b.account_id || b.name) === accountId
    );

    return { account, entity, balances: accountBalances, connectorMode: mode };
  } catch {
    return { account: null, entity: { name: '—' }, balances: [], connectorMode: mode };
  }
};
