import postgres from 'postgres';
import { getConnector } from './loader';
import type { ConnectorConfig } from './types';

let sql: ReturnType<typeof postgres> | null = null;

function getClient() {
  if (!sql) {
    sql = postgres(process.env.DATABASE_URL!, {
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 10,
    });
  }
  return sql;
}

/**
 * Build a SELECT query from the connector config.
 * Maps their column names to our standard field names.
 */
function buildSelect(mapping: { table: string; columns: Record<string, string>; filters?: Record<string, any> }, fields: string[]) {
  const client = getClient();
  const cols = mapping.columns;
  
  // Build column list with aliases: their_col AS our_field
  const selectCols = fields
    .filter(f => cols[f]) // skip unmapped fields
    .map(f => `${cols[f]} AS ${f}`)
    .join(', ');

  // Build WHERE from filters
  const filterEntries = Object.entries(mapping.filters || {});
  const whereClause = filterEntries.length > 0
    ? ' WHERE ' + filterEntries.map(([col, val]) => `${col} = ${typeof val === 'string' ? `'${val}'` : val}`).join(' AND ')
    : '';

  return { selectCols, whereClause, table: mapping.table };
}

/**
 * Fetch all entities from the connected database.
 */
export async function fetchEntities() {
  const connector = getConnector();
  const client = getClient();
  const { selectCols, whereClause, table } = buildSelect(connector.entities, 
    ['id', 'name', 'type', 'parentId', 'country', 'currency', 'taxId']);

  const rows = await client.unsafe(`
    SELECT ${selectCols} FROM ${table}${whereClause} ORDER BY name
  `);
  
  return rows.map(normalizeEntity);
}

/**
 * Fetch all accounts with their entity info.
 */
export async function fetchAccounts() {
  const connector = getConnector();
  const client = getClient();
  const acct = connector.accounts;
  const ent = connector.entities;

  const acctCols = ['id', 'entityId', 'name', 'type', 'currency', 'accountNumber', 'bankName', 'isActive'];
  const entCols = ['name'];

  const acctSelect = acctCols
    .filter(f => acct.columns[f])
    .map(f => `a.${acct.columns[f]} AS account_${f}`)
    .join(', ');

  const entSelect = entCols
    .filter(f => ent.columns[f])
    .map(f => `e.${ent.columns[f]} AS entity_${f}`)
    .join(', ');

  const joinCol = acct.columns.entityId;
  
  const rows = await client.unsafe(`
    SELECT ${acctSelect}, ${entSelect}
    FROM ${acct.table} a
    INNER JOIN ${ent.table} e ON a.${joinCol} = e.${ent.columns.id}
    ORDER BY e.${ent.columns.name}, a.${acct.columns.name}
  `);

  return rows.map(normalizeAccount);
}

/**
 * Fetch latest balance for a specific account.
 */
export async function fetchLatestBalance(accountId: string) {
  const connector = getConnector();
  const client = getClient();
  const bal = connector.balances;

  if (bal.mode === 'transaction') {
    // Sum all transactions up to latest date
    const rows = await client.unsafe(`
      SELECT 
        '${bal.columns.accountId}' AS source_account,
        SUM(${bal.columns.balance}) AS balance,
        MAX(${bal.columns.date}) AS date
      FROM ${bal.table}
      WHERE ${bal.columns.accountId} = '${accountId}'
      GROUP BY ${bal.columns.accountId}
    `);
    return rows[0] || null;
  }

  // Snapshot mode — get the latest entry
  const rows = await client.unsafe(`
    SELECT 
      ${bal.columns.balance} AS balance,
      ${bal.columns.date} AS date
      ${bal.columns.currency ? `, ${bal.columns.currency} AS currency` : ", 'EUR' AS currency"}
    FROM ${bal.table}
    WHERE ${bal.columns.accountId} = '${accountId}'
    ORDER BY ${bal.columns.date} DESC
    LIMIT 1
  `);
  return rows[0] || null;
}

/**
 * Fetch all balances for dashboard view.
 */
export async function fetchDashboard() {
  const connector = getConnector();
  const [entities, accounts] = await Promise.all([fetchEntities(), fetchAccounts()]);

  // Get latest balance for each account
  const balances = [];
  for (const account of accounts) {
    const latest = await fetchLatestBalance(account.id);
    balances.push({
      account,
      entity: { name: account.entityName },
      latestBalance: latest ? {
        balance: latest.balance,
        date: latest.date,
        currency: latest.currency || account.currency || 'EUR',
      } : null,
    });
  }

  // Totals by currency
  const totalsByCurrency: Record<string, number> = {};
  for (const b of balances) {
    if (b.latestBalance) {
      const curr = b.latestBalance.currency;
      totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + parseFloat(b.latestBalance.balance);
    }
  }

  return { balances, anomalies: [], totalsByCurrency };
}

// Normalizers — map raw DB rows to our standard shape
function normalizeEntity(row: any) {
  return {
    id: row.id,
    name: row.name,
    type: row.type || 'headquarters',
    parentId: row.parentId || null,
    country: row.country || null,
    currency: row.currency || 'EUR',
    taxId: row.taxId || null,
  };
}

function normalizeAccount(row: any) {
  return {
    id: row.account_id,
    entityId: row.account_entityId,
    name: row.account_name,
    type: row.account_type || 'bank',
    currency: row.account_currency || 'EUR',
    accountNumber: row.account_accountNumber || null,
    bankName: row.account_bankName || null,
    isActive: row.account_isActive !== false,
    entityName: row.entity_name || 'Unknown',
  };
}
