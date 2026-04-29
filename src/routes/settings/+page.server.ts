import type { PageServerLoad } from './$types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const load: PageServerLoad = async () => {
  let connectorMode: string = 'setup';
  let connector = null;
  let errors: string[] = [];
  let hasCustom = false;
  let rawJson = '';

  try {
    // Check connector mode
    const { isApiConnector } = await import('$lib/connector/api-connector');
    if (isApiConnector()) {
      connectorMode = 'api';
    } else if (process.env.DATABASE_URL) {
      connectorMode = 'database';
    }
  } catch {
    // fallback to setup
  }

  try {
    const connectorPath = join(process.cwd(), 'connector.json');
    hasCustom = existsSync(connectorPath);
    
    if (hasCustom) {
      rawJson = readFileSync(connectorPath, 'utf8');
      connector = JSON.parse(rawJson);
      // Basic validation inline
      if (connector.type === 'api' && !connector.entities?.url) {
        errors.push('entities.url is required');
      }
    }
  } catch (e: any) {
    errors.push(e.message);
  }

  return {
    connectorMode,
    connector,
    errors,
    hasCustom,
    rawJson,
    databaseUrl: process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@') || null,
  };
};
