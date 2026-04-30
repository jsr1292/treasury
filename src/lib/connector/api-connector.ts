import { getConnectorByCompanyIndex } from './loader';
import type { ApiConnectorConfig, ApiEndpoint, ApiAuth, JoinConfig } from './api-types';
import type { ConnectorConfig } from './types';
import { applyTransforms, type TransformStep } from './transforms';
import { buildPaginationParams, extractCursor, extractLinkNext, shouldContinue, type PaginationConfig } from './pagination';
import { extractByPath } from './jsonpath';
import { fuzzyMatch, findBestMatch } from './fuzzy';

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

  const pagination = (endpoint as any).pagination as PaginationConfig | undefined;
  const allData: any[] = [];
  let page = pagination?.startPage ?? 1;
  let cursor: string | undefined;
  let nextLink: string | undefined;

  // For link_header pagination, we iterate by following Link: rel="next" headers
  // For offset/cursor pagination, we iterate by building params
  while (true) {
    // Build URL with params
    let url = endpoint.url;

    // Build pagination params for offset/cursor types
    let pageParams: Record<string, string> = {};
    if (pagination && pagination.type !== 'none' && pagination.type !== 'link_header') {
      pageParams = buildPaginationParams(pagination, page, cursor);
    } else if (pagination?.type === 'link_header' && nextLink) {
      url = nextLink; // Override URL for link_header
    }

    // Replace path params first
    for (const [key, val] of Object.entries({ ...params, ...pageParams })) {
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

    let res: Response;
    try {
      const opts: RequestInit = { method: endpoint.method || 'GET', headers, signal: controller.signal };

      if (endpoint.method === 'POST' && endpoint.body) {
        let body = JSON.stringify(endpoint.body);
        for (const [key, val] of Object.entries({ ...params, ...pageParams })) {
          body = body.replace(`{${key}}`, val);
        }
        headers['Content-Type'] = 'application/json';
        opts.body = body;
      }

      res = await fetch(url, opts);
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`API ${res.status}: ${res.statusText} — ${url}`);
      }

      const json = await res.json();

      // Extract the data array
      const rawData = pagination?.dataPath
        ? extractByPath(json, pagination.dataPath)
        : extractByPath(json, endpoint.dataPath ?? '');

      const pageData = Array.isArray(rawData) ? rawData : [rawData];

      // For non-paginated calls, just return the data
      if (!pagination || pagination.type === 'none') {
        setCache(cacheKey, pageData, ttl, companyIndex);
        return pageData;
      }

      // Accumulate data
      if (pageData.length > 0) {
        allData.push(...pageData);
      }

      // Determine next iteration
      if (pagination.type === 'link_header') {
        nextLink = extractLinkNext(res.headers);
        if (!nextLink) break;
      } else if (pagination.type === 'cursor') {
        cursor = extractCursor(json, pagination.cursorPath ?? 'next_cursor');
        if (!cursor) break;
      } else if (pagination.type === 'offset') {
        if (!shouldContinue(pagination, page, pageData)) break;
        page++;
      }

      // Safety check
      if (allData.length >= (pagination.maxPages ?? 50) * (pagination.pageSize ?? 100)) {
        break;
      }
    } catch (e: any) {
      clearTimeout(timer);
      if (e.name === 'AbortError') throw new Error(`API timeout (${timeout}ms): ${url}`);
      throw e;
    }
  }

  setCache(cacheKey, allData, ttl, companyIndex);
  return allData;
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

/**
 * Apply join rules to resolve entity references in accounts.
 * Replaces hardcoded fuzzy matching with configurable join rules.
 */
function applyJoinsToAccounts(
  accounts: any[],
  entities: any[],
  joins: JoinConfig[]
): any[] {
  if (!joins || joins.length === 0) {
    // Fall back to existing fuzzy auto-match for entityName field
    return applyDefaultEntityJoin(accounts, entities);
  }

  // Build entity lookup by the toField
  const entityByField = new Map<string, any>();
  for (const e of entities) {
    for (const join of joins) {
      const key = e[join.toField];
      if (key) entityByField.set(String(key).toLowerCase(), e);
    }
  }

  const threshold = joins[0]?.fuzzyThreshold ?? 0.85;

  return accounts.map(acct => {
    const resolved = { ...acct };

    for (const join of joins) {
      const fromVal = resolved[join.fromField];
      if (!fromVal) continue;

      const valLower = String(fromVal).toLowerCase();

      if (join.method === 'exact') {
        const entity = entityByField.get(valLower);
        if (entity) {
          resolved.entityId = entity.id;
          resolved.entityName = entity.name;
        }
      } else if (join.method === 'contains') {
        // Find entity whose toField value is contained in fromVal or vice versa
        const entity = entities.find(e => {
          const v = String(e[join.toField] || '').toLowerCase();
          return valLower.includes(v) || v.includes(valLower);
        });
        if (entity) {
          resolved.entityId = entity.id;
          resolved.entityName = entity.name;
        }
      } else if (join.method === 'fuzzy') {
        const entity = findBestMatchWithThreshold(String(fromVal), entities.map(e => e[join.toField]).filter(Boolean), entityByField, threshold);
        if (entity) {
          resolved.entityId = entity.id;
          resolved.entityName = entity.name;
        }
      }
    }
    return resolved;
  });
}

function findBestMatchWithThreshold(query: string, candidates: string[], entityByField: Map<string, any>, threshold: number): any | null {
  let best: any = null;
  let bestScore = 0;
  const queryLower = query.toLowerCase();

  for (const [key, entity] of entityByField.entries()) {
    if (queryLower === key) return entity; // exact match shortcut
    const score = fuzzyMatch(query, key);
    if (score > bestScore && score >= threshold) {
      bestScore = score;
      best = entity;
    }
  }
  return best;
}

/**
 * Fallback entity join when no explicit joins are configured.
 * Uses fuzzy matching on entityName field.
 */
function applyDefaultEntityJoin(accounts: any[], entities: any[]): any[] {
  if (!entities.length) return accounts;

  // Build entity name lookup (case-insensitive)
  const entityByName = new Map<string, any>();
  for (const e of entities) {
    if (e.name) entityByName.set(e.name.toLowerCase(), e);
  }

  return accounts.map(acct => {
    const entityName = acct.entityName;
    if (!entityName) return acct;

    const nameLower = entityName.toLowerCase();
    // Exact match first
    if (entityByName.has(nameLower)) {
      const entity = entityByName.get(nameLower);
      return { ...acct, entityId: entity.id, entityName: entity.name };
    }

    // Fuzzy match
    const best = findBestMatchWithThreshold(entityName, [], entityByName, 0.85);
    if (best) {
      return { ...acct, entityId: best.id, entityName: best.name };
    }

    return acct;
  });
}

export async function fetchApiDashboard(companyIndex: number = 0) {
  const config = getApiConfig(companyIndex);
  const joins = config?.joins ?? [];

  const [entities, accounts, balances] = await Promise.all([
    fetchApiEntities(companyIndex),
    fetchApiAccounts(companyIndex),
    fetchApiBalances(companyIndex),
  ]);

  // Apply join rules to resolve entity names → entity IDs
  const accountsWithJoins = applyJoinsToAccounts(accounts, entities, joins);

  const balanceMap = new Map<string, any>();
  for (const b of balances) {
    const key = b.accountId || b.account_id;
    if (key) balanceMap.set(String(key), b);
  }

  const totalsByCurrency: Record<string, number> = {};
  const enrichedAccounts = accountsWithJoins.map(acct => {
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
