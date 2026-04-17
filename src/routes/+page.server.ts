import { getDashboard, getBalanceHistory } from '$lib/server/db/queries';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const dash = await getDashboard();

  // Get balance history for the first 5 accounts (for trend charts)
  const chartDays = parseInt(process.env.CHART_HISTORY_DAYS || '90');
  const historyMap: Record<string, { date: string; balance: number; currency: string }[]> = {};
  for (const { account } of dash.balances.slice(0, 5)) {
    historyMap[account.id] = await getBalanceHistory(account.id, chartDays);
  }

  return { ...dash, chartDays, historyMap };
};
