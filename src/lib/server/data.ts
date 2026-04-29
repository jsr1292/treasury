/**
 * Data layer — abstracts whether data comes from the built-in database or an API connector.
 * Supports multi-company: pass companyIndex to scope data to a specific company.
 * Pass companyIndex = -1 for consolidated (all companies).
 */

import type { LayoutServerLoad } from './$types.js';

let _apiModule: any = null;
async function getApiModule() {
  if (!_apiModule) {
    _apiModule = await import('$lib/connector/api-connector');
  }
  return _apiModule;
}

let _dbAvailable: boolean | null = null;
export function isDatabaseAvailable(): boolean {
  if (_dbAvailable !== null) return _dbAvailable;
  _dbAvailable = !!process.env.DATABASE_URL;
  return _dbAvailable;
}

export async function getConnectorMode(companyIndex: number = 0): Promise<'database' | 'api' | 'setup'> {
  const api = await getApiModule();
  if (api.isApiConnector(companyIndex)) return 'api';
  if (isDatabaseAvailable()) return 'database';
  return 'setup';
}

// Lazy-load DB only when available
let _db: any = null;
async function getDb() {
  if (!_db && isDatabaseAvailable()) {
    const mod = await import('$lib/server/db/index.js');
    _db = mod.db;
  }
  return _db;
}

// ─── Companies ────────────────────────────────────────────────────

export function getCompanyList(): { name: string; index: number }[] {
  // Dynamic import to avoid circular deps
  const { getCompanies } = require('$lib/connector/loader');
  const companies = getCompanies();
  return companies.map((c: any, i: number) => ({ name: c.name, index: i }));
}

// ─── Entities ─────────────────────────────────────────────────────

export async function getEntities(companyIndex: number = 0) {
  const api = await getApiModule();
  if (api.isApiConnector(companyIndex)) {
    return api.fetchApiEntities(companyIndex);
  }
  const db = await getDb();
  if (!db) return [];
  const { entities } = await import('$lib/server/db/schema.js');
  return db.select().from(entities);
}

export async function getEntitiesConsolidated(companyIndices: number[]) {
  const results = await Promise.all(companyIndices.map(idx => getEntities(idx)));
  return results.flat();
}

// ─── Accounts ─────────────────────────────────────────────────────

export async function getAccounts(companyIndex: number = 0) {
  const api = await getApiModule();
  if (api.isApiConnector(companyIndex)) {
    return api.fetchApiAccounts(companyIndex);
  }
  const db = await getDb();
  if (!db) return [];
  const { accounts } = await import('$lib/server/db/schema.js');
  return db.select().from(accounts);
}

export async function getAccountsConsolidated(companyIndices: number[]) {
  const results = await Promise.all(companyIndices.map(idx => getAccounts(idx)));
  return results.flat();
}

// ─── Balances ──────────────────────────────────────────────────────

export async function getBalances(companyIndex: number = 0) {
  const api = await getApiModule();
  if (api.isApiConnector(companyIndex)) {
    return api.fetchApiBalances(companyIndex);
  }
  const db = await getDb();
  if (!db) return [];
  const { balanceEntries } = await import('$lib/server/db/schema.js');
  return db.select().from(balanceEntries);
}

export async function getBalancesConsolidated(companyIndices: number[]) {
  const results = await Promise.all(companyIndices.map(idx => getBalances(idx)));
  return results.flat();
}

// ─── Dashboard ─────────────────────────────────────────────────────

export async function getDashboard(companyIndex: number = 0) {
  const api = await getApiModule();
  if (api.isApiConnector(companyIndex)) {
    return api.fetchApiDashboard(companyIndex);
  }
  const db = await getDb();
  if (!db) {
    return { balances: [], anomalies: [], totalsByCurrency: {} };
  }
  const { getDashboard: dbGetDashboard } = await import('$lib/server/db/queries');
  return dbGetDashboard();
}

export async function getDashboardConsolidated(companyIndices: number[]) {
  const api = await getApiModule();
  // Check if all are API connectors
  const isApi = companyIndices.every(idx => api.isApiConnector(idx));
  
  if (isApi) {
    return api.fetchApiDashboardConsolidated(companyIndices);
  }
  
  // Mixed or DB mode — aggregate manually
  const results = await Promise.all(companyIndices.map(idx => getDashboard(idx)));
  
  const allBalances: any[] = [];
  const totalsByCurrency: Record<string, number> = {};
  
  for (const result of results) {
    allBalances.push(...(result.balances || []));
    for (const [currency, total] of Object.entries(result.totalsByCurrency || {})) {
      totalsByCurrency[currency] = (totalsByCurrency[currency] || 0) + (total as number);
    }
  }
  
  return {
    balances: allBalances,
    totalsByCurrency,
    anomalies: [],
    consolidated: true,
  };
}

// ─── FX Rates ──────────────────────────────────────────────────────

export async function getFxRates(companyIndex: number = 0) {
  const api = await getApiModule();
  if (api.isApiConnector(companyIndex)) {
    return api.fetchApiFxRates(companyIndex);
  }
  const db = await getDb();
  if (!db) return [];
  const { fxRates } = await import('$lib/server/db/schema.js');
  const { desc } = await import('drizzle-orm');
  return db.select().from(fxRates).orderBy(desc(fxRates.date)).limit(6);
}

// ─── Anomalies ─────────────────────────────────────────────────────

export async function getAnomalies(companyIndex: number = 0) {
  const api = await getApiModule();
  if (api.isApiConnector(companyIndex)) return [];
  const db = await getDb();
  if (!db) return [];
  const { anomalies, accounts, balanceEntries } = await import('$lib/server/db/schema.js');
  const { desc, eq } = await import('drizzle-orm');
  return db.select({
    id: anomalies.id,
    type: anomalies.type,
    severity: anomalies.severity,
    message: anomalies.message,
    createdAt: anomalies.createdAt,
    accountName: accounts.name,
  })
  .from(anomalies)
  .leftJoin(balanceEntries, eq(anomalies.balanceEntryId, balanceEntries.id))
  .leftJoin(accounts, eq(balanceEntries.accountId, accounts.id))
  .where(eq(anomalies.isResolved, false))
  .orderBy(desc(anomalies.createdAt))
  .limit(5);
}
