import { getEntityTree } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const tree = await getEntityTree();
  return { tree };
};
