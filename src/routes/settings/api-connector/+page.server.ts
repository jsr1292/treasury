import { getConnector } from '$lib/connector/loader';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    const connector = getConnector();
    return { connector };
  } catch {
    return { connector: null };
  }
};
