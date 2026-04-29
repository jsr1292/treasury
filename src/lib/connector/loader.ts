import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ConnectorConfig } from './types';
import type { ApiConnectorConfig } from './api-types';
import { defaultConnector } from './types';

let cachedConnector: ConnectorConfig | ApiConnectorConfig | MultiCompanyConfig | null = null;

export interface CompanyConfig {
  name: string;
  connector: ConnectorConfig | ApiConnectorConfig;
}

export interface MultiCompanyConfig {
  companies: CompanyConfig[];
}

export function clearConnectorCache() {
  cachedConnector = null;
}

export type UnifiedConnector = 
  | { mode: 'database'; config: ConnectorConfig }
  | { mode: 'api'; config: ApiConnectorConfig };

/**
 * Load connector config from connector.json, or fall back to built-in schema.
 * Supports:
 * - Legacy single connector: { type: 'api', ... }
 * - Multi-company: { companies: [{ name: "TYPSA", connector: { type: 'api', ... } }, ...] }
 */
export function getConnector(): ConnectorConfig | ApiConnectorConfig | MultiCompanyConfig {
  if (cachedConnector) return cachedConnector;

  const connectorPath = join(process.cwd(), 'connector.json');
  
  if (existsSync(connectorPath)) {
    try {
      const raw = readFileSync(connectorPath, 'utf8');
      const parsed = JSON.parse(raw);
      cachedConnector = parsed;
      
      // Backwards compatibility: if root has type: 'api' but no companies, wrap it
      if ((parsed as any).type === 'api' && !parsed.companies) {
        cachedConnector = {
          companies: [{
            name: (parsed as any).name || 'Default',
            connector: parsed as ApiConnectorConfig,
          }]
        } as MultiCompanyConfig;
        console.log(`[Connector] Loaded single API connector, wrapped as multi-company (1 company)`);
      } else if (parsed.companies && parsed.companies.length > 0) {
        console.log(`[Connector] Loaded multi-company config: ${parsed.companies.map((c: CompanyConfig) => c.name).join(', ')}`);
      } else if (parsed.type === 'database') {
        console.log(`[Connector] Loaded: database — ${parsed.name || 'custom'}`);
      }
      return cachedConnector;
    } catch (e) {
      console.error('[Connector] Failed to parse connector.json, using default:', e);
    }
  }

  cachedConnector = defaultConnector;
  return cachedConnector;
}

export function getCompanies(): CompanyConfig[] {
  const config = getConnector();
  if ('companies' in config && Array.isArray(config.companies)) {
    return config.companies;
  }
  // Wrap legacy single connector
  const legacy = config as any;
  if (legacy.type === 'api') {
    return [{ name: legacy.name || 'Company', connector: legacy as ApiConnectorConfig }];
  }
  return [{ name: 'Default', connector: legacy as ConnectorConfig }];
}

export function getCompanyByIndex(index: number): CompanyConfig | null {
  const companies = getCompanies();
  if (index === -1) return null; // Consolidated view
  return companies[index] ?? null;
}

export function getCompanyConnector(index: number): ConnectorConfig | ApiConnectorConfig | null {
  const company = getCompanyByIndex(index);
  return company?.connector ?? null;
}

export function getUnifiedConnector(companyIndex: number = 0): UnifiedConnector | null {
  const connector = getCompanyConnector(companyIndex);
  if (!connector) return null;
  if ((connector as any).type === 'api') {
    return { mode: 'api', config: connector as unknown as ApiConnectorConfig };
  }
  return { mode: 'database', config: connector as ConnectorConfig };
}

export function isMultiCompany(): boolean {
  const config = getConnector();
  return 'companies' in config && Array.isArray(config.companies) && config.companies.length > 1;
}

export function getCompanyCount(): number {
  return getCompanies().length;
}

export function getConnectorByCompanyIndex(companyIndex: number): ConnectorConfig | ApiConnectorConfig | null {
  return getCompanyConnector(companyIndex);
}

/**
 * Validate a connector config.
 */
export function validateConnector(config: any): string[] {
  const errors: string[] = [];
  
  // Multi-company validation
  if (config.companies && Array.isArray(config.companies)) {
    if (config.companies.length === 0) {
      errors.push('At least one company is required');
    }
    config.companies.forEach((company: any, i: number) => {
      if (!company.name) errors.push(`Company ${i + 1}: name is required`);
      if (!company.connector) errors.push(`Company ${i + 1}: connector config is required`);
      else {
        const connectorErrors = validateConnector(company.connector);
        connectorErrors.forEach(e => errors.push(`Company ${i + 1} (${company.name}): ${e}`));
      }
    });
    return errors;
  }

  // Single connector validation (legacy)
  if (config.type === 'api') {
    // API connector validation
    if (!config.entities?.url) errors.push('entities.url is required');
    if (!config.entities?.fields || Object.keys(config.entities.fields).length === 0) errors.push('entities.fields mapping is required');
    // accounts and balances are optional
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

/**
 * Save connector config to connector.json
 */
export function saveConnectorConfig(config: any): void {
  const path = join(process.cwd(), 'connector.json');
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf8');
  clearConnectorCache();
}
