import { getFxRates, getConnectorMode } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const mode = getConnectorMode();
  try {
    const rates = await getFxRates();
    const currencies = [...new Set(rates.map((r: any) => r.base || r.from || r.fromCurrency))];
    return { rates, currencies, connectorMode: mode };
  } catch {
    return { rates: [], currencies: [], connectorMode: mode };
  }
};
