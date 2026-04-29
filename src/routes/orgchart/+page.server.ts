import { getEntities, getConnectorMode } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const mode = getConnectorMode();
  try {
    const allEntities = await getEntities();
    const tree = buildTree(allEntities);
    return { tree, connectorMode: mode };
  } catch {
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
