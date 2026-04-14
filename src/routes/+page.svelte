<script>
  let { data } = $props();
  import { formatNumber, formatCurrency, formatDateShort } from '$lib/format';

  const typeIcons = { bank: '🏦', savings: '💰', deposit: '📋', bond: '📜', other: '💳' };
</script>

<svelte:head>
  <title>Treasury — Dashboard</title>
</svelte:head>

<div class="max-w-5xl mx-auto page-desktop">
  <!-- KPI Row -->
  {#if Object.keys(data.totalsByCurrency).length > 0}
    <div class="grid gap-4 mb-6" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
      {#each Object.entries(data.totalsByCurrency) as [currency, total]}
        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-medium uppercase tracking-[0.08em]" style="color: var(--text3);">Total {currency}</span>
            <span class="badge badge-gold">{currency}</span>
          </div>
          <div class="text-2xl font-bold mono" style="color: {currency === 'EUR' ? 'var(--gold)' : 'var(--green)'};">
            {formatCurrency(total, currency)}
          </div>
        </div>
      {/each}

      <!-- Quick stats -->
      <div class="stat-card">
        <div class="text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style="color: var(--text3);">Accounts</div>
        <div class="flex items-end gap-4">
          <div>
            <div class="text-2xl font-bold mono" style="color: var(--text);">{data.balances.length}</div>
            <div class="text-[10px]" style="color: var(--text3);">Total</div>
          </div>
          <div>
            <div class="text-lg font-bold mono" style="color: var(--green);">{data.balances.filter(b => b.latestBalance).length}</div>
            <div class="text-[10px]" style="color: var(--text3);">Active</div>
          </div>
          <div>
            <div class="text-lg font-bold mono" style="color: {data.anomalies.length > 0 ? 'var(--red)' : 'var(--text3)'};">{data.anomalies.length}</div>
            <div class="text-[10px]" style="color: var(--text3);">Alerts</div>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="stat-card text-center py-16 mb-6">
      <div class="text-4xl mb-4">🏦</div>
      <div class="text-base font-medium mb-2" style="color: var(--text);">Welcome to Treasury</div>
      <div style="color: var(--text3); font-size: 13px; max-width: 360px; margin: 0 auto;">
        Create an entity and add bank accounts to start tracking your cash position.
      </div>
      <a href="/entities" class="inline-block mt-4 px-5 py-2.5 rounded-lg text-xs font-semibold btn-gold no-underline">Get Started →</a>
    </div>
  {/if}

  <!-- Anomalies -->
  {#if data.anomalies.length > 0}
    <div class="mb-6">
      <div class="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3" style="color: var(--red);">⚠ Alerts</div>
      <div class="space-y-2">
        {#each data.anomalies as anomaly}
          <div class="stat-card flex items-center gap-3" style="border-left: 3px solid {anomaly.severity === 'critical' ? 'var(--red)' : '#ffd70a'};">
            <span>{anomaly.severity === 'critical' ? '🔴' : '🟡'}</span>
            <span class="text-sm" style="color: var(--text);">{anomaly.message}</span>
            <span class="flex-1"></span>
            <span class="text-[10px]" style="color: var(--text3);">{new Date(anomaly.createdAt).toLocaleDateString()}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Account balances table -->
  {#if data.balances.length > 0}
    <div>
      <div class="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3" style="color: var(--text3);">Cash Position by Account</div>

      <!-- Desktop table -->
      <div class="stat-card hidden md:block" style="padding: 0; overflow: hidden;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Account</th>
              <th>Entity</th>
              <th>Type</th>
              <th style="text-align: right;">Balance</th>
              <th style="text-align: right;">Currency</th>
              <th style="text-align: right;">Updated</th>
            </tr>
          </thead>
          <tbody>
            {#each data.balances as { account, entity, latestBalance }}
              <tr>
                <td>
                  <a href="/accounts/{account.id}" class="no-underline" style="color: var(--text); font-weight: 500;">
                    {account.name}
                  </a>
                </td>
                <td style="color: var(--text3);">{entity.name}</td>
                <td><span class="badge badge-{account.type === 'bank' ? 'blue' : account.type === 'deposit' ? 'green' : account.type === 'bond' ? 'gold' : 'gold'}">{account.type}</span></td>
                <td style="text-align: right;" class="mono font-semibold">
                  {#if latestBalance}
                    <span style="color: var(--gold);">{formatNumber(latestBalance.balance)}</span>
                  {:else}
                    <span style="color: var(--text3);">—</span>
                  {/if}
                </td>
                <td style="text-align: right; color: var(--text3);">{account.currency}</td>
                <td style="text-align: right; color: var(--text3);">{latestBalance ? formatDateShort(latestBalance.date) : '—'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <div class="md:hidden space-y-2">
        {#each data.balances as { account, entity, latestBalance }}
          <a href="/accounts/{account.id}" class="account-row block no-underline">
            <div class="text-base">{typeIcons[account.type] || '💳'}</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold truncate" style="color: var(--text);">{account.name}</div>
              <div class="text-[10px]" style="color: var(--text3);">{entity.name} · {account.currency}</div>
            </div>
            <div class="text-right">
              {#if latestBalance}
                <div class="text-sm font-bold mono" style="color: var(--gold);">{formatNumber(latestBalance.balance)}</div>
                <div class="text-[10px]" style="color: var(--text3);">{formatDateShort(latestBalance.date)}</div>
              {:else}
                <div class="text-[10px]" style="color: var(--text3);">No data</div>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>
