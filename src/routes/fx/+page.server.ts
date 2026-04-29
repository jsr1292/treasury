import { getFxRates, getConnectorMode, getCompanyList } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
  const companyIndex = parseInt(cookies.get('company') || '0', 10);
  const isConsolidated = companyIndex === -1;
  const companies = getCompanyList();
  const mode = await getConnectorMode(companyIndex);

  try {
    let rates: any[];
    if (isConsolidated) {
      const indices = companies.map((_: any, i: number) => i);
      const results = await Promise.all(indices.map((i: number) => getFxRates(i)));
      rates = results.flat();
    } else {
      rates = await getFxRates(companyIndex);
    }
    const currencies = [...new Set(rates.map((r: any) => r.base || r.from || r.fromCurrency))];
    return { rates: rates || [], currencies: currencies || [], connectorMode: mode, isConsolidated };
  } catch {
    return { rates: [], currencies: [], connectorMode: mode, isConsolidated };
  }
};
