import { getEntities } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  try {
    const allEntities = await getEntities();
    const entity = allEntities.find((e: any) => e.id === params.id);
    return { entity: entity || null, entityId: params.id };
  } catch {
    return { entity: null, entityId: params.id };
  }
};
