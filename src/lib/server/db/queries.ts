import { db } from './index';
import { entities, accounts, balanceEntries, anomalies } from './schema';
import { eq, desc, sql, and } from 'drizzle-orm';

// Entities
export async function getEntities() {
  return db.select().from(entities).orderBy(entities.name);
}

export async function getEntitiesByParent(parentId: string | null) {
  if (parentId) return db.select().from(entities).where(eq(entities.parentId, parentId));
  return db.select().from(entities).where(sql`${entities.parentId} IS NULL`);
}

export async function createEntity(data: {
  name: string; type: string; parentId?: string; taxId?: string;
  country?: string; currency?: string; metadata?: any;
}) {
  const [entity] = await db.insert(entities).values({
    name: data.name,
    type: data.type as any,
    parentId: data.parentId || null,
    taxId: data.taxId || null,
    country: data.country || null,
    currency: data.currency || 'EUR',
    metadata: data.metadata || null,
  }).returning();
  return entity;
}

// Accounts
export async function getAccountsByEntity(entityId: string) {
  return db.select().from(accounts).where(eq(accounts.entityId, entityId)).orderBy(accounts.name);
}

export async function getAllAccounts() {
  return db.select({
    account: accounts,
    entity: entities,
  })
    .from(accounts)
    .innerJoin(entities, eq(accounts.entityId, entities.id))
    .orderBy(entities.name, accounts.name);
}

export async function createAccount(data: {
  entityId: string; name: string; type: string; currency?: string;
  accountNumber?: string; bankName?: string; maturityDate?: string;
  interestRate?: string;
}) {
  const [account] = await db.insert(accounts).values({
    entityId: data.entityId,
    name: data.name,
    type: data.type as any,
    currency: data.currency || 'EUR',
    accountNumber: data.accountNumber || null,
    bankName: data.bankName || null,
    maturityDate: data.maturityDate || null,
    interestRate: data.interestRate || null,
  }).returning();
  return account;
}

// Balance entries
export async function getLatestBalances(accountId: string) {
  return db.select().from(balanceEntries)
    .where(eq(balanceEntries.accountId, accountId))
    .orderBy(desc(balanceEntries.date))
    .limit(30);
}

export async function getLatestBalance(accountId: string) {
  const [row] = await db.select().from(balanceEntries)
    .where(eq(balanceEntries.accountId, accountId))
    .orderBy(desc(balanceEntries.date))
    .limit(1);
  return row;
}

export async function createBalanceEntry(data: {
  accountId: string; date: string; balance: string; currency: string;
  balanceEur?: string; fxRate?: string; notes?: string;
}) {
  // Check for anomaly
  const prev = await getLatestBalance(data.accountId);
  const newBalance = parseFloat(data.balance);
  
  const [entry] = await db.insert(balanceEntries).values({
    accountId: data.accountId,
    date: data.date,
    balance: data.balance,
    currency: data.currency,
    balanceEur: data.balanceEur || null,
    fxRate: data.fxRate || null,
    notes: data.notes || null,
  }).returning();

  // Anomaly detection
  if (prev) {
    const prevBalance = parseFloat(prev.balance);
    const changePercent = Math.abs((newBalance - prevBalance) / prevBalance * 100);
    const threshold = parseFloat(process.env.ANOMALY_THRESHOLD || '50');
    
    if (changePercent > threshold) {
      await db.insert(anomalies).values({
        balanceEntryId: entry.id,
        type: 'spike',
        severity: changePercent > 200 ? 'critical' : 'warning',
        message: `Balance changed ${changePercent.toFixed(1)}% (${prev.balance} → ${data.balance})`,
        previousBalance: prev.balance,
        changePercent: changePercent.toFixed(2),
      });
    }
  }

  return entry;
}

// Dashboard
export async function getDashboard() {
  const allAccounts = await getAllAccounts();
  const allAnomalies = await db.select().from(anomalies)
    .where(eq(anomalies.isResolved, false))
    .orderBy(desc(anomalies.createdAt))
    .limit(10);

  // Get latest balance for each account
  const balances = [];
  for (const { account, entity } of allAccounts) {
    const latest = await getLatestBalance(account.id);
    balances.push({ account, entity, latestBalance: latest || null });
  }

  // Totals by currency
  const totalsByCurrency = new Map();
  for (const b of balances) {
    if (b.latestBalance) {
      const curr = b.latestBalance.currency;
      const current = totalsByCurrency.get(curr) || 0;
      totalsByCurrency.set(curr, current + parseFloat(b.latestBalance.balance));
    }
  }

  return { balances, anomalies: allAnomalies, totalsByCurrency: Object.fromEntries(totalsByCurrency) };
}
