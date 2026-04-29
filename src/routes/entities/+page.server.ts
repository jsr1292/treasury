import { getEntities } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    const allEntities = await getEntities();
    return { entities: allEntities };
  } catch {
    return { entities: [] };
  }
};
