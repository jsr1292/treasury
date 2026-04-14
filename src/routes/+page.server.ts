import { fetchDashboard } from '$lib/connector/query-builder';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  return fetchDashboard();
};
