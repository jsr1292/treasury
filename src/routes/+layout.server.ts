import { getFxRates, getAnomalies, getConnectorMode, getCompanyList } from '$lib/server/data';
import { getCompanyConnector } from '$lib/connector/loader';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ cookies }) => {
  const companyIndex = parseInt(cookies.get('company') || '0', 10);
  const companies = await getCompanyList();
  const isMulti = companies.length > 1;
  const selectedCompany = companies[companyIndex] || companies[0] || { name: 'All Companies', index: -1 };
  const mode = await getConnectorMode(companyIndex);

  // Load refreshInterval from connector config
  let refreshInterval = 0;
  try {
    const connector = getCompanyConnector(companyIndex);
    if (connector && (connector as any).refreshInterval) {
      refreshInterval = (connector as any).refreshInterval;
    }
  } catch {
    // Ignore
  }

  if (mode === 'setup') {
    return {
      connectorMode: mode,
      fxRates: [],
      anomalies: [],
      companies,
      selectedCompany,
      isMultiCompany: isMulti,
      refreshInterval,
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
    refreshInterval,
  };
};
