import { getFxRates, getAnomalies, getConnectorMode, getCompanyList } from '$lib/server/data';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const companyIndex = parseInt(cookies.get('company') || '0', 10);
  const companies = getCompanyList();
  const isMulti = companies.length > 1;
  const selectedCompany = companies[companyIndex] || companies[0] || { name: 'All Companies', index: -1 };
  const mode = await getConnectorMode(companyIndex);

  if (mode === 'setup') {
    return {
      connectorMode: mode,
      fxRates: [],
      anomalies: [],
      companies,
      selectedCompany,
      isMultiCompany: isMulti,
    };
  }

  const [latestFx, recentAnomalies] = await Promise.all([
    getFxRates(companyIndex).catch(() => []),
    getAnomalies(companyIndex).catch(() => []),
  ]);

  return {
    connectorMode: mode,
    fxRates: latestFx,
    anomalies: recentAnomalies,
    companies,
    selectedCompany,
    isMultiCompany: isMulti,
  };
};
