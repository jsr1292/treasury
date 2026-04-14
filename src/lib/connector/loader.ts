import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ConnectorConfig } from './types';
import { defaultConnector } from './types';

let cachedConnector: ConnectorConfig | null = null;

/**
 * Load connector config from connector.json, or fall back to built-in schema.
 * Results are cached for the process lifetime.
 */
export function getConnector(): ConnectorConfig {
  if (cachedConnector) return cachedConnector;

  const connectorPath = join(process.cwd(), 'connector.json');
  
  if (existsSync(connectorPath)) {
    try {
      const raw = readFileSync(connectorPath, 'utf8');
      cachedConnector = JSON.parse(raw) as ConnectorConfig;
      console.log(`[Connector] Loaded: ${cachedConnector.name || 'custom'}`);
      return cachedConnector;
    } catch (e) {
      console.error('[Connector] Failed to parse connector.json, using default:', e);
    }
  }

  cachedConnector = defaultConnector;
  return cachedConnector;
}

/**
 * Validate a connector config — check required fields exist.
 */
export function validateConnector(config: ConnectorConfig): string[] {
  const errors: string[] = [];

  if (!config.entities?.table) errors.push('entities.table is required');
  if (!config.entities?.columns?.id) errors.push('entities.columns.id is required');
  if (!config.entities?.columns?.name) errors.push('entities.columns.name is required');

  if (!config.accounts?.table) errors.push('accounts.table is required');
  if (!config.accounts?.columns?.id) errors.push('accounts.columns.id is required');
  if (!config.accounts?.columns?.entityId) errors.push('accounts.columns.entityId is required');
  if (!config.accounts?.columns?.name) errors.push('accounts.columns.name is required');

  if (!config.balances?.table) errors.push('balances.table is required');
  if (!config.balances?.columns?.accountId) errors.push('balances.columns.accountId is required');
  if (!config.balances?.columns?.date) errors.push('balances.columns.date is required');
  if (!config.balances?.columns?.balance) errors.push('balances.columns.balance is required');

  return errors;
}
