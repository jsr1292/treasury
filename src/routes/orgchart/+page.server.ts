import { getEntities, getConnectorMode, getCompanyList } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const companyIndex = parseInt(cookies.get('company') || '0', 10);
  const isConsolidated = companyIndex === -1;
  const companies = getCompanyList();
  const mode = await getConnectorMode(companyIndex);

  try {
    let allEntities: any[];
    if (isConsolidated) {
      const indices = companies.map((_: any, i: number) => i);
      allEntities = await Promise.all(indices.map((i: number) => getEntities(i))).then(r => r.flat());
    } else {
      allEntities = await getEntities(companyIndex);
    }
    const tree = buildTree(allEntities);
    return { tree, connectorMode: mode, isConsolidated };
  } catch (e) {
    console.error('[OrgChart] Error:', e);
    return { tree: [], connectorMode: mode, isConsolidated };
  }
};

function buildTree(entities: any[]): any[] {
  if (!entities || entities.length === 0) return [];
  const map = new Map(entities.map((e: any) => [e.id, { ...e, children: [] as any[] }]));
  const roots: any[] = [];
  for (const entity of entities) {
    const node = map.get(entity.id)!;
    if (entity.parentId && map.has(entity.parentId)) {
      map.get(entity.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
