import { getAccounts, getBalances, getConnectorMode } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const mode = getConnectorMode();
  try {
    const [accounts, balances] = await Promise.all([getAccounts(), getBalances()]);
    const account = accounts.find((a: any) => a.id === params.id);
    const accountBalances = balances.filter((b: any) => 
      String(b.accountId || b.account_id) === params.id
    );
    return { account: account || null, balances: accountBalances, connectorMode: mode };
  } catch {
    return { account: null, balances: [], connectorMode: mode };
  }
};
