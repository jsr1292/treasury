import { getConnectorByCompanyIndex } from './loader';
import type { ApiConnectorConfig, ApiEndpoint, ApiAuth } from './api-types';
import type { ConnectorConfig } from './types';
import { applyTransforms, type TransformStep } from './transforms';

// ─── Cache ────────────────────────────────────────────────────────

interface CacheEntry {
  data: any;
  fetchedAt: number;
  ttl: number;
  companyIndex: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string, companyIndex: number): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.companyIndex !== companyIndex) return null; // Company mismatch
  if (Date.now() - entry.fetchedAt > entry.ttl * 1000) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any, ttl: number, companyIndex: number) {
  cache.set(key, { data, fetchedAt: Date.now(), ttl, companyIndex });
}

export function clearCache() {
  cache.clear();
}

// ─── HTTP Fetcher ─────────────────────────────────────────────────

async function apiFetch(endpoint: ApiEndpoint, params: Record<string, string> = {}, config?: ApiConnectorConfig, companyIndex: number = 0): Promise<any> {
  const cacheKey = endpoint.url + JSON.stringify(params);
  const ttl = endpoint.cacheTtl || config?.cacheTtl || 1800;
  
  const cached = getCached(cacheKey, companyIndex);
  if (cached) return cached;

  // Build URL with params
  let url = endpoint.url;
  for (const [key, val] of Object.entries(params)) {
    url = url.replace(`{${key}}`, encodeURIComponent(val));
  }

  // Build headers
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(config?.auth?.headers || {}),
  };

  if (config?.auth) {
    switch (config.auth.type) {
      case 'bearer':
        if (config.auth.token) headers['Authorization'] = `Bearer ${config.auth.token}`;
        break;
      case 'basic':
        if (config.auth.username && config.auth.password) {
          headers['Authorization'] = `Basic ${Buffer.from(`${config.auth.username}:${config.auth.password}`).toString('base64')}`;
        }
        break;
      case 'api-key':
        if (config.auth.headerName && config.auth.apiKey) {
          headers[config.auth.headerName] = config.auth.apiKey;
        }
        break;
    }
  }

  const timeout = endpoint.timeout || config?.timeout || 15000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const opts: RequestInit = { method: endpoint.method || 'GET', headers, signal: controller.signal };
    
    if (endpoint.method === 'POST' && endpoint.body) {
      let body = JSON.stringify(endpoint.body);
      for (const [key, val] of Object.entries(params)) {
        body = body.replace(`{${key}}`, val);
      }
      headers['Content-Type'] = 'application/json';
      opts.body = body;
    }

    const res = await fetch(url, opts);
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`API ${res.status}: ${res.statusText} — ${url}`);
    }

    const json = await res.json();
    const data = extractData(json, endpoint.dataPath);
    setCache(cacheKey, data, ttl, companyIndex);
    return data;
  } catch (e: any) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new Error(`API timeout (${timeout}ms): ${url}`);
    throw e;
  }
}

function extractData(json: any, dataPath?: string): any {
  if (!dataPath) return json;
  const parts = dataPath.split('.');
  let current = json;
  for (const part of parts) {
    if (current == null) return null;
    current = current[part];
  }
  return current;
}

// ─── Field Mapping ────────────────────────────────────────────────

/**
 * Normalize a FieldConfig value.
 * Supports both old format (string) and new format ({ source, transforms }).
 */
function normalizeFieldConfig(fieldValue: any): { source: string; transforms: TransformStep[] } {
  if (typeof fieldValue === 'string') {
    return { source: fieldValue, transforms: [] };
  }
  if (fieldValue && typeof fieldValue === 'object' && 'source' in fieldValue) {
    return { source: fieldValue.source, transforms: fieldValue.transforms ?? [] };
  }
  return { source: String(fieldValue), transforms: [] };
}

/**
 * Resolve the value of a source field, supporting coalesce.
 * If the field name is not found but the config has coalesce transforms, those are handled by applyTransforms.
 */
function resolveSourceValue(row: any, source: string): any {
  if (row && typeof row === 'object' && source in row) {
    return row[source];
  }
  return undefined;
}

const TYPE_MAP: Record<string, string> = {
  'sucursal': 'branch', 'filial': 'subsidiary', 'sede': 'headquarters',
  'casa matriz': 'headquarters', 'matriz': 'headquarters', 'oficina': 'branch',
  'headquarters': 'headquarters', 'branch': 'branch', 'subsidiary': 'subsidiary',
  'sucursal del perú': 'branch', 'sucursal del brasil': 'branch',
};

const ACCOUNT_TYPE_MAP: Record<string, string> = {
  'cuenta corriente': 'bank', 'corriente': 'bank', 'checking': 'bank',
  'current account': 'bank', 'cuenta de ahorro': 'savings', 'ahorro': 'savings',
  'savings': 'savings', 'depósito': 'deposit', 'deposito': 'deposit',
  'deposit': 'deposit', 'plazo fijo': 'deposit', 'certificado': 'deposit',
  'bono': 'bond', 'bond': 'bond', 'bono de inversión': 'bond',
  'inversión': 'bond', 'inversion': 'bond', 'investment': 'bond',
  'línea de crédito': 'credit', 'linea de credito': 'credit', 'credit': 'credit',
  'loan': 'credit', 'préstamo': 'credit', 'prestamo': 'credit',
  'bank': 'bank', 'other': 'other',
};

function normalizeType(val: string): string {
  if (!val) return val;
  const lower = val.toLowerCase().trim();
  // Entity types
  if (TYPE_MAP[lower]) return TYPE_MAP[lower];
  for (const [key, mapped] of Object.entries(TYPE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return mapped;
  }
  // Account types
  if (ACCOUNT_TYPE_MAP[lower]) return ACCOUNT_TYPE_MAP[lower];
  for (const [key, mapped] of Object.entries(ACCOUNT_TYPE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return mapped;
  }
  return val;
}

function mapFields(rows: any[], fields: Record<string, any>): any[] {
  if (!rows || !Array.isArray(rows)) return [];

  const mappedRows = rows.map((row, index) => {
    const mapped: Record<string, any> = {};

    for (const [ourField, fieldConfig] of Object.entries(fields)) {
      const { source, transforms } = normalizeFieldConfig(fieldConfig);
      let rawValue = resolveSourceValue(row, source);

      // Apply transform pipeline
      const transformed = applyTransforms(rawValue, transforms, row);
      if (transformed !== null) {
        mapped[ourField] = transformed;
      }
    }

    // Post-processing: normalize type field
    if (mapped.type) {
      mapped.type = normalizeType(mapped.type);
    }
    // Auto-fill isActive
    if (mapped.isActive === undefined) {
      mapped.isActive = true;
    }
    // Auto-generate id if missing
    if (!mapped.id) {
      mapped.id = mapped.name || String(index + 1);
    }
    return mapped;
  });

  // Auto-link branches to headquarters
  const hq = mappedRows.find(e => e.type === 'headquarters');
  if (hq) {
    for (const row of mappedRows) {
      if (row.type === 'branch' && !row.parentId) {
        row.parentId = hq.id;
      }
    }
  }
  if (!hq) {
    const parentNames = new Set(mappedRows.filter(r => r.parentName).map(r => r.parentName));
    for (const pName of parentNames) {
      const parent = mappedRows.find(e => e.name?.includes(pName) || e.id === pName);
      if (parent) {
        for (const row of mappedRows) {
          if (row.parentName === pName && row.id !== parent.id) {
            row.parentId = parent.id;
          }
        }
      }
    }
  }
  for (const row of mappedRows) {
    delete row.parentName;
  }

  return mappedRows;
}

// ─── Public API ───────────────────────────────────────────────────

export function isApiConnector(companyIndex: number = 0): boolean {
  try {
    const connector = getConnectorByCompanyIndex(companyIndex);
    if (!connector) return false;
    return (connector as any).type === 'api';
  } catch {
    return false;
  }
}

export function getApiConfig(companyIndex: number = 0): ApiConnectorConfig | null {
  try {
    const connector = getConnectorByCompanyIndex(companyIndex);
    if (!connector) return null;
    if ((connector as any).type === 'api') return connector as unknown as ApiConnectorConfig;
    return null;
  } catch {
    return null;
  }
}

export async function fetchApiEntities(companyIndex: number = 0) {
  const config = getApiConfig(companyIndex);
  if (!config) throw new Error('No API connector configured');
  
  const rows = await apiFetch(config.entities, {}, config, companyIndex);
  return mapFields(Array.isArray(rows) ? rows : [rows], config.entities.fields);
}

export async function fetchApiAccounts(companyIndex: number = 0) {
  const config = getApiConfig(companyIndex);
  if (!config) throw new Error('No API connector configured');
  
  const rows = await apiFetch(config.accounts, {}, config, companyIndex);
  return mapFields(Array.isArray(rows) ? rows : [rows], config.accounts.fields);
}

export async function fetchApiBalances(companyIndex: number = 0) {
  const config = getApiConfig(companyIndex);
  if (!config) throw new Error('No API connector configured');
  
  const endpoint = config.balances?.url ? config.balances : config.accounts;
  const fields = config.balances?.url ? config.balances.fields : (config.balances?.fields || {});
  
  const rows = await apiFetch(endpoint, {}, config, companyIndex);
  return mapFields(Array.isArray(rows) ? rows : [rows], fields);
}

export async function fetchApiBalanceHistory(accountId: string, companyIndex: number = 0) {
  const config = getApiConfig(companyIndex);
  if (!config?.balanceHistory) return [];
  
  const paramKey = config.balanceHistory.accountIdParam || 'accountId';
  const rows = await apiFetch(config.balanceHistory, { [paramKey]: accountId }, config, companyIndex);
  return mapFields(Array.isArray(rows) ? rows : [rows], config.balanceHistory.fields);
}

export async function fetchApiFxRates(companyIndex: number = 0) {
  const config = getApiConfig(companyIndex);
  if (!config?.fxRates) return [];
  
  const rows = await apiFetch(config.fxRates, {}, config, companyIndex);
  return mapFields(Array.isArray(rows) ? rows : [rows], config.fxRates.fields);
}

export async function fetchApiDashboard(companyIndex: number = 0) {
  const [entities, accounts, balances] = await Promise.all([
    fetchApiEntities(companyIndex),
    fetchApiAccounts(companyIndex),
    fetchApiBalances(companyIndex),
  ]);

  const balanceMap = new Map<string, any>();
  for (const b of balances) {
    const key = b.accountId || b.account_id;
    if (key) balanceMap.set(String(key), b);
  }

  const totalsByCurrency: Record<string, number> = {};
  const enrichedAccounts = accounts.map(acct => {
    const bal = balanceMap.get(String(acct.id || acct.accountId));
    const balance = bal ? parseFloat(bal.balance || bal.amount || 0) : 0;
    const currency = acct.currency || bal?.currency || 'EUR';
    
    totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + balance;
    
    return {
      ...acct,
      latestBalance: bal ? { balance, date: bal.date, currency } : null,
    };
  });

  return {
    entities,
    accounts: enrichedAccounts,
    balances: enrichedAccounts,
    totalsByCurrency,
    anomalies: [],
  };
}

// ─── Consolidated (all companies) ─────────────────────────────────

export async function fetchApiDashboardConsolidated(companyIndices: number[]) {
  const results = await Promise.all(
    companyIndices.map(idx => fetchApiDashboard(idx))
  );

  const allEntities: any[] = [];
  const allAccounts: any[] = [];
  const allBalances: any[] = [];
  const totalsByCurrency: Record<string, number> = {};

  for (const result of results) {
    allEntities.push(...result.entities);
    allAccounts.push(...result.accounts);
    allBalances.push(...result.balances);
    for (const [currency, total] of Object.entries(result.totalsByCurrency)) {
      totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + (total as number);
    }
  }

  return {
    entities: allEntities,
    accounts: allAccounts,
    balances: allBalances,
    totalsByCurrency,
    anomalies: [],
    consolidated: true,
  };
}

// ─── Connection Test ──────────────────────────────────────────────

export async function testApiConnection(config: ApiConnectorConfig): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const start = Date.now();
  try {
    await apiFetch(config.entities, {}, config, 0);
    return { ok: true, message: 'Connection successful', latencyMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, message: e.message, latencyMs: Date.now() - start };
  }
}
