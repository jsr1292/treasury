import { getEntities, getAccountsByEntity } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const allEntities = await getEntities();
  const entity = allEntities.find(e => e.id === params.id);
  if (!entity) return { entity: null, children: [], accounts: [] };

  // Find children (branches/subsidiaries)
  const children = allEntities.filter(e => e.parentId === entity.id);
  const accounts = await getAccountsByEntity(entity.id);

  return { entity, children, accounts };
};
