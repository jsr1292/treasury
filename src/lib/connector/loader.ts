import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ConnectorConfig } from './types';
import type { ApiConnectorConfig } from './api-types';
import { defaultConnector } from './types';

let cachedConnector: ConnectorConfig | ApiConnectorConfig | null = null;

export type UnifiedConnector = 
  | { mode: 'database'; config: ConnectorConfig }
  | { mode: 'api'; config: ApiConnectorConfig };

/**
 * Load connector config from connector.json, or fall back to built-in schema.
 * Supports both "database" and "api" connector types.
 */
export function getConnector(): ConnectorConfig | ApiConnectorConfig {
  if (cachedConnector) return cachedConnector;

  const connectorPath = join(process.cwd(), 'connector.json');
  
  if (existsSync(connectorPath)) {
    try {
      const raw = readFileSync(connectorPath, 'utf8');
      const parsed = JSON.parse(raw);
      cachedConnector = parsed;
      console.log(`[Connector] Loaded: ${parsed.type || 'database'} — ${parsed.name || 'custom'}`);
      return cachedConnector;
    } catch (e) {
      console.error('[Connector] Failed to parse connector.json, using default:', e);
    }
  }

  cachedConnector = defaultConnector;
  return cachedConnector;
}

/**
 * Get unified connector info — mode + typed config.
 */
export function getUnifiedConnector(): UnifiedConnector {
  const connector = getConnector();
  if ((connector as any).type === 'api') {
    return { mode: 'api', config: connector as unknown as ApiConnectorConfig };
  }
  return { mode: 'database', config: connector as ConnectorConfig };
}

/**
 * Validate a connector config.
 */
export function validateConnector(config: any): string[] {
  const errors: string[] = [];
  
  if (config.type === 'api') {
    // API connector validation
    if (!config.entities?.url) errors.push('entities.url is required');
    if (!config.entities?.fields) errors.push('entities.fields mapping is required');
    if (!config.accounts?.url) errors.push('accounts.url is required');
    if (!config.accounts?.fields) errors.push('accounts.fields mapping is required');
    if (!config.balances?.url) errors.push('balances.url is required');
    if (!config.balances?.fields) errors.push('balances.fields mapping is required');
  } else {
    // Database connector validation (existing)
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
  }

  return errors;
}
