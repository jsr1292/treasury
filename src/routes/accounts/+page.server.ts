import { getAccounts, getEntities } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    const [allAccounts, allEntities] = await Promise.all([getAccounts(), getEntities()]);
    
    // Normalize: API returns flat objects, DB returns {account, entity}
    const accounts = allAccounts.map((a) => {
      if (a.account) return a; // DB format
      
      // API format — match entity by entityName
      let entityName = a.entityName || '—';
      if (a.entityName) {
        const matched = allEntities.find((e) => e.name === a.entityName || e.id === a.entityName)
          || allEntities.find((e) => e.name?.includes(a.entityName) || a.entityName.includes(e.name));
        if (matched) entityName = matched.name;
      }
      
      return { account: a, entity: { name: entityName } };
    });
    
    return { accounts };
  } catch {
    return { accounts: [] };
  }
};
