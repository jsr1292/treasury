import { getEntities, getConnectorMode } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const mode = await getConnectorMode();
  try {
    const allEntities = await getEntities();
    console.log('[OrgChart] Entities:', JSON.stringify(allEntities.map((e: any) => ({ id: e.id, name: e.name, type: e.type, parentId: e.parentId || null })), null, 2));
    const tree = buildTree(allEntities);
    console.log('[OrgChart] Tree roots:', tree.length, 'Children per root:', tree.map((r: any) => ({ name: r.name, childCount: r.children?.length })));
    return { tree, connectorMode: mode };
  } catch (e) {
    console.error('[OrgChart] Error:', e);
    return { tree: [], connectorMode: mode };
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
