import { getConnector } from '$lib/connector/loader';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    const connector = getConnector();
    return { connector: (connector as any).type === 'api' ? connector : null };
  } catch {
    return { connector: null };
  }
};
