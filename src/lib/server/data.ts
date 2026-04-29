/**
 * Data layer — abstracts whether data comes from the built-in database or an API connector.
 * 
 * If DATABASE_URL is set → use PostgreSQL (built-in mode)
 * If connector.json has type: "api" → use HTTP endpoints (API mode)
 * If neither → return empty data (setup mode)
 */

import { getUnifiedConnector } from '$lib/connector/loader';
import { isApiConnector, fetchApiDashboard, fetchApiEntities, fetchApiAccounts, fetchApiBalances } from '$lib/connector/api-connector';

let _dbAvailable: boolean | null = null;

export function isDatabaseAvailable(): boolean {
  if (_dbAvailable !== null) return _dbAvailable;
  _dbAvailable = !!process.env.DATABASE_URL;
  return _dbAvailable;
}

export function getConnectorMode(): 'database' | 'api' | 'setup' {
  if (isApiConnector()) return 'api';
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

// ─── Entities ─────────────────────────────────────────────────────

export async function getEntities() {
  if (isApiConnector()) {
    return fetchApiEntities();
  }
  const db = await getDb();
  if (!db) return [];
  const { entities } = await import('$lib/server/db/schema.js');
  return db.select().from(entities);
}

// ─── Accounts ─────────────────────────────────────────────────────

export async function getAccounts() {
  if (isApiConnector()) {
    return fetchApiAccounts();
  }
  const db = await getDb();
  if (!db) return [];
  const { accounts } = await import('$lib/server/db/schema.js');
  return db.select().from(accounts);
}

// ─── Balances ──────────────────────────────────────────────────────

export async function getBalances() {
  if (isApiConnector()) {
    return fetchApiBalances();
  }
  const db = await getDb();
  if (!db) return [];
  const { balanceEntries } = await import('$lib/server/db/schema.js');
  return db.select().from(balanceEntries);
}

// ─── Dashboard ─────────────────────────────────────────────────────

export async function getDashboard() {
  if (isApiConnector()) {
    return fetchApiDashboard();
  }
  // Database mode — use existing queries
  const db = await getDb();
  if (!db) {
    return { balances: [], anomalies: [], totalsByCurrency: {} };
  }
  const { getDashboard: dbGetDashboard } = await import('$lib/server/db/queries');
  return dbGetDashboard();
}

// ─── FX Rates ──────────────────────────────────────────────────────

export async function getFxRates() {
  if (isApiConnector()) {
    const { fetchApiFxRates } = await import('$lib/connector/api-connector');
    return fetchApiFxRates();
  }
  const db = await getDb();
  if (!db) return [];
  const { fxRates } = await import('$lib/server/db/schema.js');
  const { desc } = await import('drizzle-orm');
  return db.select().from(fxRates).orderBy(desc(fxRates.date)).limit(6);
}

// ─── Anomalies ─────────────────────────────────────────────────────

export async function getAnomalies() {
  if (isApiConnector()) return []; // API mode doesn't detect anomalies (yet)
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
