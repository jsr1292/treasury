import { getEntities, getCompanyList } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const companyIndex = parseInt(cookies.get('company') || '0', 10);
  const isConsolidated = companyIndex === -1;
  const companies = getCompanyList();

  try {
    let allEntities: any[];
    if (isConsolidated) {
      const indices = companies.map((_: any, i: number) => i);
      allEntities = await Promise.all(indices.map((i: number) => getEntities(i))).then(r => r.flat());
    } else {
      allEntities = await getEntities(companyIndex);
    }
    return { entities: allEntities, isConsolidated };
  } catch {
    return { entities: [], isConsolidated };
  }
};
