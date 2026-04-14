import { getEntities } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const allEntities = await getEntities();
  return { entities: allEntities };
};
