import { getAllAccounts } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const allAccounts = await getAllAccounts();
  return { accounts: allAccounts };
};
