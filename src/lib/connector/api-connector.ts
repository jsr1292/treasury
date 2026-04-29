import { getConnector } from './loader';
import type { ApiConnectorConfig, ApiEndpoint, ApiAuth } from './api-types';
import type { ConnectorConfig } from './types';

// ─── Cache ────────────────────────────────────────────────────────

interface CacheEntry {
  data: any;
  fetchedAt: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > entry.ttl * 1000) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any, ttl: number) {
  cache.set(key, { data, fetchedAt: Date.now(), ttl });
}

export function clearCache() {
  cache.clear();
}

// ─── HTTP Fetcher ─────────────────────────────────────────────────

async function apiFetch(endpoint: ApiEndpoint, params: Record<string, string> = {}, config?: ApiConnectorConfig): Promise<any> {
  const cacheKey = endpoint.url + JSON.stringify(params);
  const ttl = endpoint.cacheTtl || config?.cacheTtl || 1800;
  
  const cached = getCached(cacheKey);
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
    setCache(cacheKey, data, ttl);
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

const TYPE_MAP: Record<string, string> = {
  'sucursal': 'branch', 'filial': 'subsidiary', 'sede': 'headquarters',
  'casa matriz': 'headquarters', 'matriz': 'headquarters', 'oficina': 'branch',
  'headquarters': 'headquarters', 'branch': 'branch', 'subsidiary': 'subsidiary',
  'sucursal del perú': 'branch', 'sucursal del brasil': 'branch',
};

function normalizeType(val: string): string {
  if (!val) return val;
  const lower = val.toLowerCase().trim();
  // Exact match
  if (TYPE_MAP[lower]) return TYPE_MAP[lower];
  // Partial match
  for (const [key, mapped] of Object.entries(TYPE_MAP)) {
    if (lower.includes(key) || key.includes(lower)) return mapped;
  }
  return val;
}

function mapFields(rows: any[], fields: Record<string, string>): any[] {
  if (!rows || !Array.isArray(rows)) return [];
  
  return rows.map((row, index) => {
    const mapped: Record<string, string> = {};
    // fields: { ourField: theirField }
    for (const [ourField, theirField] of Object.entries(fields)) {
      if (row[theirField] !== undefined) {
        mapped[ourField] = row[theirField];
      }
    }
    // Normalize type to English if mapped
    if (mapped.type) {
      mapped.type = normalizeType(mapped.type);
    }
    // Normalize currency: extract ISO code from "Name (XXX)"
    if (mapped.currency) {
      const match = String(mapped.currency).match(/\(([A-Z]{3})\)/);
      if (match) mapped.currency = match[1];
    }
    // Ensure id exists for navigation
    if (!mapped.id) {
      mapped.id = mapped.name || String(index + 1);
    }
    return mapped;
  });
}

// ─── Public API ───────────────────────────────────────────────────

export function isApiConnector(): boolean {
  try {
    const connector = getConnector();
    return (connector as any).type === 'api';
    } catch {
    return false;
  }
}

export function getApiConfig(): ApiConnectorConfig | null {
  try {
    const connector = getConnector();
    if ((connector as any).type === 'api') return connector as unknown as ApiConnectorConfig;
    return null;
  } catch {
    return null;
  }
}

export async function fetchApiEntities() {
  const config = getApiConfig();
  if (!config) throw new Error('No API connector configured');
  
  const rows = await apiFetch(config.entities, {}, config);
  return mapFields(Array.isArray(rows) ? rows : [rows], config.entities.fields);
}

export async function fetchApiAccounts() {
  const config = getApiConfig();
  if (!config) throw new Error('No API connector configured');
  
  const rows = await apiFetch(config.accounts, {}, config);
  return mapFields(Array.isArray(rows) ? rows : [rows], config.accounts.fields);
}

export async function fetchApiBalances() {
  const config = getApiConfig();
  if (!config) throw new Error('No API connector configured');
  
  const rows = await apiFetch(config.balances, {}, config);
  return mapFields(Array.isArray(rows) ? rows : [rows], config.balances.fields);
}

export async function fetchApiBalanceHistory(accountId: string) {
  const config = getApiConfig();
  if (!config?.balanceHistory) return [];
  
  const paramKey = config.balanceHistory.accountIdParam || 'accountId';
  const rows = await apiFetch(config.balanceHistory, { [paramKey]: accountId }, config);
  return mapFields(Array.isArray(rows) ? rows : [rows], config.balanceHistory.fields);
}

export async function fetchApiFxRates() {
  const config = getApiConfig();
  if (!config?.fxRates) return [];
  
  const rows = await apiFetch(config.fxRates, {}, config);
  return mapFields(Array.isArray(rows) ? rows : [rows], config.fxRates.fields);
}

export async function fetchApiDashboard() {
  const [entities, accounts, balances] = await Promise.all([
    fetchApiEntities(),
    fetchApiAccounts(),
    fetchApiBalances(),
  ]);

  // Attach balances to accounts
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

// ─── Connection Test ──────────────────────────────────────────────

export async function testApiConnection(config: ApiConnectorConfig): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const start = Date.now();
  try {
    // Try fetching entities as a smoke test
    await apiFetch(config.entities, {}, config);
    return { ok: true, message: 'Connection successful', latencyMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, message: e.message, latencyMs: Date.now() - start };
  }
}
