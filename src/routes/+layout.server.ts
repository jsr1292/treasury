import { getFxRates, getAnomalies, getConnectorMode } from '$lib/server/data';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async () => {
  const mode = await getConnectorMode();

  if (mode === 'setup') {
    return {
      connectorMode: mode,
      fxRates: [],
      anomalies: [],
    };
  }

  const [latestFx, recentAnomalies] = await Promise.all([
    getFxRates().catch(() => []),
    getAnomalies().catch(() => []),
  ]);

  return {
    connectorMode: mode,
    fxRates: latestFx,
    anomalies: recentAnomalies,
  };
};
