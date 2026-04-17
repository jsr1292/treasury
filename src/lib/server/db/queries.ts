import { db } from './index';
import { entities, accounts, balanceEntries, anomalies } from './schema';
import { eq, desc, sql } from 'drizzle-orm';

// Entities
export async function getEntities() {
  return db.select().from(entities).orderBy(entities.name);
}

export async function getEntityTree() {
  const all = await db.select().from(entities).orderBy(entities.name);
  const map = new Map();
  const roots = [];
  
  // First pass: create nodes
  for (const e of all) {
    map.set(e.id, { ...e, children: [] });
  }
  
  // Second pass: build tree
  for (const e of all) {
    const node = map.get(e.id);
    if (e.parentId && map.has(e.parentId)) {
      map.get(e.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }
  
  return roots;
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

// Balance history for trend charts
export async function getBalanceHistory(accountId: string, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const rows = await db.select({
    date: balanceEntries.date,
    balance: balanceEntries.balance,
    currency: balanceEntries.currency,
  })
    .from(balanceEntries)
    .where(eq(balanceEntries.accountId, accountId))
    .orderBy(balanceEntries.date);

  return rows.map(r => ({
    date: r.date,
    balance: parseFloat(r.balance),
    currency: r.currency,
  }));
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

  // Get upcoming maturities (deposits/bonds maturing in next 90 days)
  const now = new Date();
  const in90 = new Date();
  in90.setDate(in90.getDate() + 90);

  const upcomingInstruments = await db.select({
    account: accounts,
    entity: entities,
  })
    .from(accounts)
    .innerJoin(entities, eq(accounts.entityId, entities.id))
    .where(eq(accounts.type, 'deposit'));

  const bondInstruments = await db.select({
    account: accounts,
    entity: entities,
  })
    .from(accounts)
    .innerJoin(entities, eq(accounts.entityId, entities.id))
    .where(eq(accounts.type, 'bond'));

  const allInstruments = [...upcomingInstruments, ...bondInstruments];
  const enrichedInstruments = [];
  for (const item of allInstruments) {
    if (!item.account.maturityDate) continue;
    const maturity = new Date(item.account.maturityDate);
    if (maturity < now || maturity > in90) continue;

    const [latest] = await db.select().from(balanceEntries)
      .where(eq(balanceEntries.accountId, item.account.id))
      .orderBy(desc(balanceEntries.date))
      .limit(1);

    const daysToMaturity = Math.ceil((maturity.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    enrichedInstruments.push({
      account: item.account,
      entity: item.entity,
      latestBalance: latest,
      daysToMaturity,
      balance: latest ? parseFloat(latest.balance) : 0,
    });
  }

  // Sort by nearest maturity first
  enrichedInstruments.sort((a, b) => a.daysToMaturity - b.daysToMaturity);

  const totalsByCurrency: Record<string, number> = {};
  for (const b of balances) {
    if (b.latestBalance) {
      const curr = b.latestBalance.currency;
      totalsByCurrency[curr] = (totalsByCurrency[curr] || 0) + parseFloat(b.latestBalance.balance);
    }
  }

  return {
    balances,
    anomalies: allAnomalies,
    totalsByCurrency,
    upcomingMaturities: enrichedInstruments,
  };
}
