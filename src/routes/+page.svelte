<script>
  import { formatCurrency } from '$lib/format';

  let { data } = $props();

  let totalBalance = $derived(data.summaryStats?.totalBalance || 0);
  let entityCount = $derived(data.entities?.length || 0);
  let accountCount = $derived(data.accounts?.length || 0);
  let bankCount = $derived(data.summaryStats?.bankCount || 0);
  let currencyMap = $derived(data.totalsByCurrency || {});
  let currencies = $derived(Object.entries(currencyMap));

  // Top 5 accounts by balance
  let topAccounts = $derived(() => {
    if (!data.accounts) return [];
    return [...data.accounts]
      .map(a => ({
        name: a.account?.name || a.name || '?',
        balance: a.account?.balance || a.balance || a.latestBalance?.balance || 0,
        currency: a.account?.currency || a.currency || 'EUR',
        bank: a.account?.bankName || a.bankName || '',
        entity: a.entity?.name || a.entityName || '',
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 5);
  });
</script>

<svelte:head>
  <title>Dashboard — Treasury</title>
</svelte:head>

<div class="max-w-5xl mx-auto page-desktop">

  {#if !data.accounts || data.accounts.length === 0}
    <div class="stat-card text-center py-16">
      <div class="text-3xl mb-3">🏦</div>
      <div style="color: var(--text3); font-size: 13px;">No data yet.</div>
      <div style="color: var(--text3); font-size: 11px; margin-top: 6px;">
        {#if data.connectorMode === 'setup'}
          <a href="/settings/api-connector" class="text-[var(--gold)] underline">Connect an API</a> to get started
        {/if}
      </div>
    </div>
  {:else}

  <!-- Total Balance -->
  <div class="stat-card mb-4" style="text-align: center; padding: 24px;">
    <div style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text3); margin-bottom: 6px;">Total Balance</div>
    <div style="font-size: 28px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--gold);">
      {formatCurrency(totalBalance, 'EUR')}
    </div>
    {#if currencies.length > 1}
      <div style="display: flex; justify-content: center; gap: 16px; margin-top: 8px; flex-wrap: wrap;">
        {#each currencies as [cur, amt]}
          {#if cur !== 'EUR'}
            <span style="font-size: 11px; color: var(--text3); font-family: 'JetBrains Mono', monospace;">
              {formatCurrency(amt, cur)}
            </span>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <!-- 4 Stats -->
  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px;">
    <div class="stat-card" style="padding: 12px; text-align: center;">
      <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin-bottom: 4px;">Entities</div>
      <div style="font-size: 18px; font-weight: 700; color: var(--text);">{entityCount}</div>
    </div>
    <div class="stat-card" style="padding: 12px; text-align: center;">
      <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin-bottom: 4px;">Accounts</div>
      <div style="font-size: 18px; font-weight: 700; color: var(--text);">{accountCount}</div>
    </div>
    <div class="stat-card" style="padding: 12px; text-align: center;">
      <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin-bottom: 4px;">Banks</div>
      <div style="font-size: 18px; font-weight: 700; color: var(--text);">{bankCount}</div>
    </div>
    <div class="stat-card" style="padding: 12px; text-align: center;">
      <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin-bottom: 4px;">Currencies</div>
      <div style="font-size: 18px; font-weight: 700; color: var(--text);">{currencies.length}</div>
    </div>
  </div>

  <!-- Two columns: Top accounts + Currency bars -->
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
    
    <!-- Top 5 accounts -->
    <div class="stat-card" style="padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3);">Top Accounts</div>
        <a href="/accounts" style="font-size: 9px; color: var(--gold); text-decoration: none;">All →</a>
      </div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        {#each topAccounts() as acct}
          <div style="display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 5px; background: var(--bg-surface);">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 10px; color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{acct.name}</div>
              <div style="font-size: 8px; color: var(--text3);">{acct.bank}</div>
            </div>
            <div style="font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; color: {acct.balance < 0 ? 'var(--red)' : 'var(--gold)'}; white-space: nowrap;">
              {formatCurrency(acct.balance, acct.currency)}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Currency breakdown (compact bars) -->
    <div class="stat-card" style="padding: 16px;">
      <div style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin-bottom: 10px;">By Currency</div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        {#each currencies.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8) as [cur, amt]}
          {@const maxAmt = Math.max(...currencies.map(c => Math.abs(c[1])))}
          {@const pct = maxAmt > 0 ? (Math.abs(amt) / maxAmt * 100) : 0}
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="font-size: 9px; color: var(--text3);">{cur}</span>
              <span style="font-size: 9px; font-family: 'JetBrains Mono', monospace; color: var(--text);">{formatCurrency(amt, cur)}</span>
            </div>
            <div style="height: 4px; background: var(--border); border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; width: {pct}%; background: var(--gold); border-radius: 2px; opacity: {pct > 50 ? '1' : '0.5'};"></div>
            </div>
          </div>
        {/each}
        {#if currencies.length > 8}
          <div style="font-size: 8px; color: var(--text3); text-align: center; margin-top: 2px;">+{currencies.length - 8} more</div>
        {/if}
      </div>
    </div>

  </div>

  {/if}
</div>
