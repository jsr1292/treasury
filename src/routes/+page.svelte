<script>
  import { formatNumber, formatCurrency, formatDateShort } from '$lib/format';
  import { ACCOUNT_TYPES } from '$lib/constants';
  import BalanceTrendChart from '$lib/components/BalanceTrendChart.svelte';
  import CurrencyBreakdown from '$lib/components/CurrencyBreakdown.svelte';

  let { data } = $props();

  let chartDays = $state(data.chartDays || 90);
  let selectedChartAccount = $state(data.balances?.[0]?.account?.id || null);

  let selectedHistory = $derived(selectedChartAccount ? (data.historyMap?.[selectedChartAccount] || []) : []);
  let selectedAccountName = $derived(
    data.balances.find(b => b.account.id === selectedChartAccount)?.account.name || ''
  );
  let selectedAccountCurrency = $derived(
    data.balances.find(b => b.account.id === selectedChartAccount)?.account.currency || 'EUR'
  );
</script>

<svelte:head>
  <title>Treasury — Dashboard</title>
</svelte:head>

<div class="max-w-5xl mx-auto page-desktop">

  <!-- ── Summary cards ── -->
  {#if Object.keys(data.totalsByCurrency).length > 0}
    <div class="grid gap-4 mb-6" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
      {#each Object.entries(data.totalsByCurrency) as [currency, total]}
        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-medium uppercase tracking-[0.08em]" style="color: var(--text3);">Total {currency}</span>
            <span class="badge badge-gold">{currency}</span>
          </div>
          <div class="text-2xl font-bold mono" style="color: {total >= 0 ? (currency === 'EUR' ? 'var(--gold)' : 'var(--green)') : 'var(--red)'};">
            {formatCurrency(total, currency)}
          </div>
        </div>
      {/each}

      <div class="stat-card">
        <div class="text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style="color: var(--text3);">Overview</div>
        <div class="flex items-end gap-4">
          <div>
            <div class="text-2xl font-bold mono" style="color: var(--text);">{data.balances.length}</div>
            <div class="text-[10px]" style="color: var(--text3);">Accounts</div>
          </div>
          <div>
            <div class="text-lg font-bold mono" style="color: var(--green);">{data.balances.filter(b => b.latestBalance).length}</div>
            <div class="text-[10px]" style="color: var(--text3);">Active</div>
          </div>
          <div>
            <div class="text-lg font-bold mono" style="color: {data.anomalies.length > 0 ? 'var(--red)' : 'var(--text3)'};">
              {data.anomalies.length}
            </div>
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

  <!-- ── Currency breakdown ── -->
  {#if Object.keys(data.totalsByCurrency).length > 1}
    <div class="stat-card mb-6">
      <div class="text-[10px] font-semibold uppercase tracking-[0.1em] mb-4" style="color: var(--text3);">Currency Breakdown</div>
      <CurrencyBreakdown totalsByCurrency={data.totalsByCurrency} />
    </div>
  {/if}

  <!-- ── Anomaly alerts ── -->
  {#if data.anomalies.length > 0}
    <div class="mb-6">
      <div class="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3" style="color: var(--red);">⚠ Balance Alerts — {data.anomalies.length}</div>
      <div class="space-y-2">
        {#each data.anomalies as anomaly}
          <div class="stat-card flex items-center gap-3" style="border-left: 3px solid {anomaly.severity === 'critical' ? 'var(--red)' : '#ffd70a'};">
            <span class="text-base">{anomaly.severity === 'critical' ? '🔴' : '🟡'}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm truncate" style="color: var(--text);">{anomaly.message}</div>
              <div class="text-[10px]" style="color: var(--text3);">{anomaly.type} · {anomaly.severity}</div>
            </div>
            <span class="text-[10px] mono" style="color: var(--text3); flex-shrink: 0;">
              {new Date(anomaly.createdAt).toLocaleDateString()}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ── Maturity calendar ── -->
  {#if data.upcomingMaturities && data.upcomingMaturities.length > 0}
    <div class="mb-6">
      <div class="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3" style="color: var(--text3);">📅 Upcoming Maturities (next 90 days)</div>
      <div class="grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
        {#each data.upcomingMaturities as item}
          {@const urgency = item.daysToMaturity <= 14 ? 'critical' : item.daysToMaturity <= 30 ? 'warning' : 'ok'}
          <div class="stat-card" style="border-left: 3px solid {urgency === 'critical' ? 'var(--red)' : urgency === 'warning' ? '#ffd70a' : 'var(--green)'};">
            <div class="flex items-start justify-between gap-2 mb-2">
              <div class="text-sm font-semibold truncate" style="color: var(--text);">{item.account.name}</div>
              <div class="flex-shrink-0 text-right">
                <div class="text-xl font-black mono" style="color: {urgency === 'critical' ? 'var(--red)' : urgency === 'warning' ? '#ffd70a' : 'var(--green)'};">
                  {item.daysToMaturity}d
                </div>
              </div>
            </div>
            <div class="text-[10px] mb-2" style="color: var(--text3);">{item.entity.name} · {item.account.currency}</div>
            <div class="text-sm font-bold mono" style="color: var(--gold);">
              {formatCurrency(item.balance, item.account.currency)}
            </div>
            <div class="text-[10px]" style="color: var(--text3);">
              matures {new Date(item.account.maturityDate).toLocaleDateString()}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ── Balance trend chart ── -->
  {#if data.balances.length > 0}
    <div class="stat-card mb-6">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div class="text-[10px] font-semibold uppercase tracking-[0.1em]" style="color: var(--text3);">Balance Trend</div>
        <div class="flex items-center gap-3">
          <select
            bind:value={selectedChartAccount}
            class="chart-select"
            style="font-size:11px; background:var(--bg-card); color:var(--text); border:1px solid var(--glass-border); border-radius:6px; padding:4px 8px; cursor:pointer;"
          >
            {#each data.balances as { account }}
              <option value={account.id}>{account.name}</option>
            {/each}
          </select>
          <div class="flex gap-1">
            {#each [30, 90, 365] as days}
              <button
                onclick={() => { chartDays = days; }}
                style="font-size:10px; padding:3px 10px; border-radius:20px; cursor:pointer; border:1px solid {chartDays === days ? 'var(--gold)' : 'var(--glass-border)'}; background:{chartDays === days ? 'rgba(201,168,76,0.15)' : 'transparent'}; color:{chartDays === days ? 'var(--gold)' : 'var(--text3)'}; transition:all 0.15s;"
              >
                {days}d
              </button>
            {/each}
          </div>
        </div>
      </div>

      {#if selectedHistory.length >= 2}
        <BalanceTrendChart balances={selectedHistory} accountId={selectedChartAccount} />
      {:else}
        <div class="empty-chart">
          Need at least 2 balance entries to show a trend — {selectedAccountName || 'select an account'} currently has {selectedHistory.length}.
        </div>
      {/if}
    </div>
  {/if}

  <!-- ── Account table ── -->
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
              {@const cfg = ACCOUNT_TYPES[account.type] || ACCOUNT_TYPES.other}
              {@const isNegative = latestBalance && parseFloat(latestBalance.balance) < 0}
              <tr>
                <td>
                  <a href="/accounts/{account.id}" class="no-underline" style="color: var(--text); font-weight: 500;">
                    {account.name}
                  </a>
                </td>
                <td style="color: var(--text3);">{entity.name}</td>
                <td><span class="badge {cfg.badge}">{cfg.icon} {cfg.label}</span></td>
                <td style="text-align: right;" class="mono font-semibold">
                  {#if latestBalance}
                    <span style="color: {isNegative ? 'var(--red)' : 'var(--gold)'};">
                      {formatNumber(latestBalance.balance)}
                    </span>
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
          {@const cfg = ACCOUNT_TYPES[account.type] || ACCOUNT_TYPES.other}
          {@const isNegative = latestBalance && parseFloat(latestBalance.balance) < 0}
          <a href="/accounts/{account.id}" class="account-row block no-underline">
            <div class="text-base">{cfg.icon}</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold truncate" style="color: var(--text);">{account.name}</div>
              <div class="text-[10px]" style="color: var(--text3);">{entity.name} · {account.currency}</div>
            </div>
            <div class="text-right">
              {#if latestBalance}
                <div class="text-sm font-bold mono" style="color: {isNegative ? 'var(--red)' : 'var(--gold)'};">
                  {formatNumber(latestBalance.balance)}
                </div>
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

<style>
  .chart-select {
    appearance: auto;
    max-width: 160px;
  }
  .empty-chart {
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--text3);
    font-family: monospace;
  }
</style>
