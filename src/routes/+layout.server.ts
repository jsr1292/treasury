import { getFxRates, getAnomalies, getConnectorMode } from '$lib/server/data';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async () => {
  const mode = getConnectorMode();

  // In setup mode, return empty data — user hasn't configured anything yet
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
