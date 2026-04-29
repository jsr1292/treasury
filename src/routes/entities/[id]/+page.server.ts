import { getEntities, getAccounts, getBalances, getConnectorMode } from '$lib/server/data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const mode = await getConnectorMode();

  try {
    const allEntities = await getEntities();
    const entity = allEntities.find((e: any) => String(e.id) === String(params.id));

    if (!entity) {
      return { entity: null, entityId: params.id, children: [], accounts: [], connectorMode: mode };
    }

    if (mode === 'api') {
      // In API mode, match accounts by entityName
      const allAccounts = await getAccounts();
      const allBalances = await getBalances();

      const entityName = entity.name || '';
      const entityAccounts = allAccounts.filter((a: any) => {
        const aEntityName = a.entityName || '';
        return aEntityName === entityName ||
          aEntityName.includes(entityName) ||
          entityName.includes(aEntityName) ||
          a.entityName?.toLowerCase() === entityName?.toLowerCase();
      });

      // Build balance map
      const balanceMap = new Map<string, any>();
      for (const b of allBalances) {
        const key = String(b.accountId || b.account_id || b.id || '');
        if (key) balanceMap.set(key, b);
      }

      const accounts = entityAccounts.map((a: any) => {
        const key = String(a.id || a.accountId || a.name || '');
        const bal = balanceMap.get(key);
        return {
          ...a,
          latestBalance: bal ? { balance: parseFloat(bal.balance || bal.balanceLocal || 0), date: bal.date } : null,
        };
      });

      // Children are entities with this entity as parent
      const children = allEntities.filter((e: any) =>
        e.parentId && String(e.parentId) === String(entity.id)
      );

      return { entity, entityId: params.id, children, accounts, connectorMode: mode };
    }

    // Database mode — load children and accounts via DB
    const children = allEntities.filter((e: any) =>
      e.parentId && String(e.parentId) === String(params.id)
    );

    const { db } = await import('$lib/server/db/index');
    const { accounts: dbAccounts, balanceEntries } = await import('$lib/server/db/schema');
    const { eq, desc } = await import('drizzle-orm');

    const dbAccountsForEntity = await db
      .select()
      .from(dbAccounts)
      .where(eq(dbAccounts.entityId, entity.id));

    const accounts = await Promise.all(dbAccountsForEntity.map(async (a) => {
      const [latest] = await db.select().from(balanceEntries)
        .where(eq(balanceEntries.accountId, a.id))
        .orderBy(desc(balanceEntries.date))
        .limit(1);
      return { ...a, latestBalance: latest || null };
    }));

    return { entity, entityId: params.id, children, accounts, connectorMode: mode };
  } catch (e) {
    console.error('[EntityDetail] Error:', e);
    return { entity: null, entityId: params.id, children: [], accounts: [], connectorMode: mode };
  }
};
