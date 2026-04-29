import { getAccounts } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  try {
    const allAccounts = await getAccounts();
    return { accounts: allAccounts };
  } catch {
    return { accounts: [] };
  }
};
