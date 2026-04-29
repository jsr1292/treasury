import { getConnector, validateConnector } from '$lib/connector/loader';
import { getConnectorMode } from '$lib/server/data';
import type { PageServerLoad } from './$types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const load: PageServerLoad = async () => {
  const mode = await getConnectorMode();
  
  let connector = null;
  let errors: string[] = [];
  let hasCustom = false;
  let rawJson = '';

  try {
    const connectorPath = join(process.cwd(), 'connector.json');
    hasCustom = existsSync(connectorPath);
    
    if (hasCustom) {
      rawJson = readFileSync(connectorPath, 'utf8');
      connector = JSON.parse(rawJson);
      errors = validateConnector(connector);
    }
  } catch (e: any) {
    errors.push(e.message);
  }

  return {
    connectorMode: mode,
    connector,
    errors,
    hasCustom,
    rawJson,
    databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || null,
  };
};
