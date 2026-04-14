import { db } from './index';
import { entities, accounts, balanceEntries, anomalies } from './schema';
import { eq, desc, sql } from 'drizzle-orm';

// Entities
export async function getEntities() {
  return db.select().from(entities).orderBy(entities.name);
}

export async function createEntity(data) {
  const [entity] = await db.insert(entities).values({
    name: data.name,
    type: data.type || 'headquarters',
    parentId: data.parentId || null,
    taxId: data.taxId || null,
    country: data.country || null,
    currency: data.currency || 'EUR',
    metadata: data.metadata || null,
  }).returning();
  return entity;
}

// Accounts
export async function getAllAccounts() {
  return db.select({
    account: accounts,
    entity: entities,
  })
    .from(accounts)
    .innerJoin(entities, eq(accounts.entityId, entities.id))
    .orderBy(entities.name, accounts.name);
}

export async function getAccountsByEntity(entityId) {
  return db.select().from(accounts)
    .where(eq(accounts.entityId, entityId))
    .orderBy(accounts.name);
}

export async function createAccount(data) {
  const [account] = await db.insert(accounts).values({
    entityId: data.entityId,
    name: data.name,
    type: data.type || 'bank',
    currency: data.currency || 'EUR',
    accountNumber: data.accountNumber || null,
    bankName: data.bankName || null,
    maturityDate: data.maturityDate || null,
    interestRate: data.interestRate || null,
  }).returning();
  return account;
}

// Balance entries
export async function getLatestBalance(accountId) {
  const rows = await db.select().from(balanceEntries)
    .where(eq(balanceEntries.accountId, accountId))
    .orderBy(desc(balanceEntries.date))
    .limit(1);
  return rows[0] || null;
}

export async function createBalanceEntry(data) {
  const prev = await getLatestBalance(data.accountId);
  const newBalance = parseFloat(data.balance);

  const [entry] = await db.insert(balanceEntries).values({
    accountId: data.accountId,
    date: data.date,
    balance: data.balance,
    currency: data.currency || 'EUR',
    balanceEur: data.balanceEur || null,
    fxRate: data.fxRate || null,
    notes: data.notes || null,
  }).returning();

  // Anomaly detection
  if (prev) {
    const prevBalance = parseFloat(prev.balance);
    if (prevBalance !== 0) {
      const changePercent = Math.abs((newBalance - prevBalance) / prevBalance * 100);
      const threshold = parseFloat(process.env.ANOMALY_THRESHOLD || '50');

      if (changePercent > threshold) {
        await db.insert(anomalies).values({
          balanceEntryId: entry.id,
          type: 'spike',
          severity: changePercent > 200 ? 'critical' : 'warning',
          message: `Balance changed ${changePercent.toFixed(1)}% (${prev.balance} → ${data.balance})`,
          previousBalance: prev.balance,
          changePercent: String(changePercent.toFixed(2)),
        });
      }
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

  const balances = [];
  for (const { account, entity } of allAccounts) {
    const latest = await getLatestBalance(account.id);
    balances.push({ account, entity, latestBalance: latest || null });
  }

  const totalsByCurrency = {};
  for (const b of balances) {
    if (b.latestBalance) {
      const curr = b.latestBalance.currency;
      totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + parseFloat(b.latestBalance.balance);
    }
  }

  return { balances, anomalies: allAnomalies, totalsByCurrency };
}
