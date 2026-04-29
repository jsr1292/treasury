<script>
  import { formatNumber, formatCurrency } from '$lib/format';

  let { data } = $props();

  // Summary stats
  let totalBalance = $derived(data.summaryStats?.totalBalance || 0);
  let entityCount = $derived(data.entities?.length || 0);
  let accountCount = $derived(data.accounts?.length || 0);
  let bankSet = $derived(new Set((data.accounts || []).map(a => a.account?.bankName || a.bankName).filter(Boolean)));
  let bankCount = $derived(bankSet.size);
  let currencyMap = $derived(data.totalsByCurrency || {});
  let currencies = $derived(Object.entries(currencyMap));
</script>

<svelte:head>
  <title>Dashboard — Treasury</title>
</svelte:head>

<div class="max-w-5xl mx-auto page-desktop">

  {#if !data.accounts || data.accounts.length === 0}
    <!-- Empty state -->
    <div class="stat-card text-center py-16">
      <div class="text-3xl mb-3">🏦</div>
      <div style="color: var(--text3); font-size: 13px;">No data yet.</div>
      <div style="color: var(--text3); font-size: 11px; margin-top: 6px;">
        {#if data.connectorMode === 'setup'}
          <a href="/settings/api-connector" class="text-[var(--gold)] underline">Connect an API</a> to get started
        {:else}
          Data will appear here once your connector is configured.
        {/if}
      </div>
    </div>
  {:else}

  <!-- Main balance -->
  <div class="stat-card mb-4" style="text-align: center; padding: 24px;">
    <div style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--text3); margin-bottom: 6px;">Total Balance</div>
    <div style="font-size: 28px; font-weight: 800; font-family: 'JetBrains Mono', monospace; color: var(--gold);">
      {formatCurrency(totalBalance, 'EUR')}
    </div>
    {#if currencies.length > 1}
      <div style="display: flex; justify-content: center; gap: 16px; margin-top: 8px;">
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

  <!-- Quick stats row -->
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

  <!-- Currency breakdown (compact) -->
  {#if currencies.length > 1}
    <div class="stat-card mb-4" style="padding: 16px;">
      <div style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin-bottom: 10px;">Currency Exposure</div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        {#each currencies as [cur, amt]}
          {@const maxAmt = Math.max(...Object.values(currencyMap))}
          {@const pct = maxAmt > 0 ? (amt / maxAmt * 100) : 0}
          <div style="flex: 1; min-width: 140px; padding: 10px; background: var(--bg-surface); border-radius: 8px; border: 1px solid var(--border);">
            <div style="font-size: 10px; color: var(--text3); margin-bottom: 4px;">{cur}</div>
            <div style="font-size: 16px; font-weight: 700; font-family: 'JetBrains Mono', monospace; color: var(--gold);">{formatCurrency(amt, cur)}</div>
            <div style="margin-top: 6px; height: 3px; background: var(--border); border-radius: 2px; overflow: hidden;">
              <div style="height: 100%; width: {pct}%; background: var(--gold); border-radius: 2px;"></div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Top accounts by balance (top 5 only) -->
  {#if data.accounts && data.accounts.length > 0}
    {@const sortedAccounts = [...data.accounts]
      .map(a => ({
        name: a.account?.name || a.name || 'Unknown',
        balance: a.account?.balance || a.balance || 0,
        currency: a.account?.currency || a.currency || 'EUR',
        bank: a.account?.bankName || a.bankName || '',
        entity: a.entity?.name || a.entityName || '',
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))
      .slice(0, 5)}

    <div class="stat-card mb-4" style="padding: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
        <div style="font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3);">Top Accounts</div>
        <a href="/accounts" style="font-size: 9px; color: var(--gold); text-decoration: none;">View all →</a>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        {#each sortedAccounts as acct}
          <div style="display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 6px; background: var(--bg-surface);">
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 11px; color: var(--text); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{acct.name}</div>
              <div style="font-size: 9px; color: var(--text3);">{acct.bank}{#if acct.entity} · {acct.entity}{/if}</div>
            </div>
            <div style="font-size: 12px; font-weight: 600; font-family: 'JetBrains Mono', monospace; color: {acct.balance < 0 ? 'var(--red)' : 'var(--gold)'}; white-space: nowrap;">
              {formatCurrency(acct.balance, acct.currency)}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {/if}
</div>
