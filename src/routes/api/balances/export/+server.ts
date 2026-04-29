import { getBalances, getAccounts, getEntities } from '$lib/server/data';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    const [balances, accounts, entities] = await Promise.all([
      getBalances(),
      getAccounts(),
      getEntities(),
    ]);

    // Build lookup maps
    const accountMap = new Map(accounts.map((a: any) => [String(a.id || a.accountId || a.name || ''), a]));
    const entityMap = new Map(entities.map((e: any) => [String(e.id || e.name || ''), e]));

    // CSV header
    const rows: string[] = ['Date,Account,Entity,Bank,Currency,Balance,Balance Local'];

    for (const b of balances) {
      const acctKey = String(b.accountId || b.account_id || b.id || '');
      const acct = accountMap.get(acctKey) || {};
      const entityName = acct.entityName || b.entityName || '—';
      const matchedEntity = entities.find((e: any) =>
        e.name === entityName || e.id === entityName
      );
      const entity = matchedEntity || { name: entityName };

      const date = b.date || '';
      const accountName = acct.name || acctKey;
      const bankName = acct.bankName || b.bankName || '';
      const currency = acct.currency || b.currency || 'EUR';
      const balance = b.balance || b.balanceLocal || '';
      const balanceLocal = b.balanceLocal || '';

      rows.push(`"${date}","${accountName}","${entity.name}","${bankName}","${currency}","${balance}","${balanceLocal}"`);
    }

    const csv = rows.join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="balances-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (e) {
    return new Response('Date,Account,Entity,Bank,Currency,Balance\n', {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="balances-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }
};
