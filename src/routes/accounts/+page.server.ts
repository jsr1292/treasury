import { getAccounts, getEntities, getCompanyList } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const companyIndex = parseInt(cookies.get('company') || '0', 10);
  const isConsolidated = companyIndex === -1;
  const companies = getCompanyList();

  try {
    let allAccounts: any[];
    let allEntities: any[];

    if (isConsolidated) {
      const indices = companies.map((_: any, i: number) => i);
      const results = await Promise.all(indices.map((i: number) => 
        Promise.all([getAccounts(i), getEntities(i)])
      ));
      allAccounts = results.flatMap(([accts]) => accts);
      allEntities = results.flatMap(([_, ents]) => ents);
    } else {
      [allAccounts, allEntities] = await Promise.all([
        getAccounts(companyIndex),
        getEntities(companyIndex),
      ]);
    }
    
    // Normalize: API returns flat objects, DB returns {account, entity}
    const accounts = allAccounts.map((a) => {
      if (a.account) return a; // DB format
      
      let entityName = a.entityName || '—';
      if (a.entityName) {
        const matched = allEntities.find((e) => e.name === a.entityName)
          || allEntities.find((e) => e.id === a.entityName)
          || allEntities.find((e) => e.name?.includes(a.entityName) || a.entityName.includes(e.name));
        if (matched) entityName = matched.name;
      }
      
      return { account: a, entity: { name: entityName } };
    });
    
    return { accounts, isConsolidated };
  } catch {
    return { accounts: [], isConsolidated };
  }
};
