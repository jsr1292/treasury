import { getConnector, validateConnector } from '$lib/connector/loader';
import type { PageServerLoad } from './$types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const load: PageServerLoad = async () => {
  const connector = getConnector();
  const errors = validateConnector(connector);
  
  // Check if custom connector.json exists
  const connectorPath = join(process.cwd(), 'connector.json');
  const hasCustom = existsSync(connectorPath);
  
  let rawJson = '';
  if (hasCustom) {
    rawJson = readFileSync(connectorPath, 'utf8');
  }

  return {
    connector,
    errors,
    hasCustom,
    rawJson,
    databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'), // mask password
  };
};
