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

<div class="max-w-7xl mx-auto page-desktop">

  <!-- ── Summary cards ── -->
  {#if Object.keys(data.totalsByCurrency).length > 0}
    <div class="grid gap-3 mb-5" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">
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
        </div>
      </div>
    </div>

    <!-- ── Enhanced Summary Stats ── -->
    {#if data.summaryStats && data.summaryStats.accountCount > 0}
      <div class="grid gap-3 mb-5" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));">
        <div class="stat-card">
          <div class="text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style="color: var(--text3);">Total Balance</div>
          <div class="text-xl font-bold mono" style="color: var(--gold);">
            {formatCurrency(data.summaryStats.totalBalance || 0, 'EUR')}
          </div>
          <div class="text-[10px] mt-1" style="color: var(--text3);">across all currencies</div>
        </div>

        <div class="stat-card">
          <div class="text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style="color: var(--text3);">Entities</div>
          <div class="text-xl font-bold mono" style="color: var(--text);">{data.summaryStats.entityCount || 0}</div>
          <div class="text-[10px] mt-1" style="color: var(--text3);">companies tracked</div>
        </div>

        <div class="stat-card">
          <div class="text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style="color: var(--text3);">Banks</div>
          <div class="text-xl font-bold mono" style="color: var(--text);">{data.summaryStats.bankCount || 0}</div>
          <div class="text-[10px] mt-1" style="color: var(--text3);">financial institutions</div>
        </div>

        <div class="stat-card">
          <div class="text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style="color: var(--text3);">Highest Balance</div>
          <div class="text-xl font-bold mono" style="color: var(--green);">{formatCurrency(data.summaryStats.maxBalance || 0, 'EUR')}</div>
        </div>

        <div class="stat-card">
          <div class="text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style="color: var(--text3);">Lowest Balance</div>
          <div class="text-xl font-bold mono" style="color: {data.summaryStats.minBalance < 0 ? 'var(--red)' : 'var(--text)'};">{formatCurrency(data.summaryStats.minBalance || 0, 'EUR')}</div>
        </div>
      </div>
    {/if}
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

  <!-- ── Investments summary ── -->
  {#if data.investments && data.investments.count > 0}
    <div class="grid gap-3 mb-5" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">
      <!-- Total invested -->
      <div class="stat-card">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-medium uppercase tracking-[0.08em]" style="color: var(--text3);">Total Invested</span>
          <span class="badge" style="background: rgba(0,229,160,0.1); color: var(--green); border: 1px solid rgba(0,229,160,0.2);">💰</span>
        </div>
        <div class="text-2xl font-bold mono" style="color: var(--green);">
          {formatCurrency(data.investments.total, 'USD')}
        </div>
        <div class="text-[10px] mt-1" style="color: var(--text3);">
          {data.investments.count} placement{data.investments.count !== 1 ? 's' : ''}
        </div>
      </div>

      <!-- Average rate -->
      <div class="stat-card">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-medium uppercase tracking-[0.08em]" style="color: var(--text3);">Avg. Rate</span>
          <span class="badge badge-gold">APR</span>
        </div>
        <div class="text-2xl font-bold mono" style="color: var(--gold);">
          {data.investments.avgRate.toFixed(3)}%
        </div>
        <div class="text-[10px] mt-1" style="color: var(--text3);">
          weighted average
        </div>
      </div>

      <!-- Expected annual interest -->
      <div class="stat-card">
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-medium uppercase tracking-[0.08em]" style="color: var(--text3);">Est. Annual Interest</span>
        </div>
        <div class="text-2xl font-bold mono" style="color: var(--green);">
          {formatCurrency(data.investments.total * data.investments.avgRate / 100, 'USD')}
        </div>
        <div class="text-[10px] mt-1" style="color: var(--text3);">
          at current rates
        </div>
      </div>

      <!-- Next maturity -->
      {#if data.investments.accounts[0]}
        {@const next = data.investments.accounts[0]}
        <div class="stat-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-[10px] font-medium uppercase tracking-[0.08em]" style="color: var(--text3);">
              {next.daysToMaturity !== null && next.daysToMaturity <= 30 ? '⏰ Next Maturity' : 'Furthest Maturity'}
            </span>
          </div>
          <div class="text-2xl font-bold mono" style="color: {next.daysToMaturity !== null && next.daysToMaturity <= 30 ? '#ffd70a' : 'var(--text)'};">
            {next.daysToMaturity !== null ? next.daysToMaturity + 'd' : '—'}
          </div>
          <div class="text-[10px] mt-1 truncate" style="color: var(--text3);">
            {next.account.name} · {formatCurrency(next.balance, next.account.currency)}
          </div>
        </div>
      {/if}
    </div>

    <!-- Investment detail list -->
    <div class="mb-5">
      <div class="text-[10px] font-semibold uppercase tracking-[0.1em] mb-2" style="color: var(--text3);">Placements</div>
      <div class="grid gap-2" style="grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));">
        {#each data.investments.accounts as inv}
          {@const urgency = inv.daysToMaturity !== null && inv.daysToMaturity <= 30 ? 'warning' : inv.daysToMaturity !== null && inv.daysToMaturity <= 14 ? 'critical' : 'ok'}
          <div class="stat-card py-3" style="border-left: 3px solid {urgency === 'critical' ? 'var(--red)' : urgency === 'warning' ? '#ffd70a' : 'var(--green)'};">
            <div class="flex items-start justify-between gap-2 mb-1">
              <div class="text-sm font-semibold truncate" style="color: var(--text);">{inv.account.name}</div>
              {#if inv.account.interestRate}
                <div class="text-sm font-bold mono flex-shrink-0" style="color: var(--gold);">{parseFloat(inv.account.interestRate).toFixed(2)}%</div>
              {/if}
            </div>
            <div class="text-lg font-bold mono" style="color: var(--green);">{formatCurrency(inv.balance, inv.account.currency)}</div>
            <div class="flex items-center justify-between mt-1">
              <div class="text-[10px]" style="color: var(--text3);">{inv.entity.name}</div>
              {#if inv.daysToMaturity !== null}
                <div class="text-[10px] mono" style="color: {urgency === 'critical' ? 'var(--red)' : urgency === 'warning' ? '#ffd70a' : 'var(--text3)'};">
                  {new Date(inv.account.maturityDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- ── Currency breakdown ── -->
  {#if Object.keys(data.totalsByCurrency).length > 1}
    <div class="stat-card mb-6">
      <div class="text-[10px] font-semibold uppercase tracking-[0.1em] mb-4" style="color: var(--text3);">Currency Exposure</div>
      <CurrencyBreakdown totalsByCurrency={data.totalsByCurrency} />
    </div>
  {/if}

  <!-- ── Entity Comparison ── -->
  {#if data.entityComparison && data.entityComparison.length > 1}
    <div class="stat-card mb-6">
      <div class="text-[10px] font-semibold uppercase tracking-[0.1em] mb-4" style="color: var(--text3);">Entity Comparison</div>
      <div class="space-y-3">
        {#each data.entityComparison as entity, i}
          {@const total = entity.total}
          {@const maxTotal = data.entityComparison[0]?.total || 1}
          {@const pct = maxTotal > 0 ? (total / maxTotal * 100).toFixed(1) : '0'}
          {@const isLargest = i === 0}
          <div class="flex items-center gap-3">
            <div class="text-xs font-medium w-32 truncate" style="color: var(--text);" title={entity.name}>{entity.name}</div>
            <div class="flex-1 h-6 rounded-full overflow-hidden" style="background: rgba(255,255,255,0.05);">
              <div
                class="h-full rounded-full transition-all"
                style="width: {pct}%; background: {isLargest ? 'linear-gradient(90deg, var(--gold), var(--gold2))' : 'rgba(201,168,76,0.3)'};"
              ></div>
            </div>
            <div class="text-xs mono font-semibold w-32 text-right" style="color: {isLargest ? 'var(--gold)' : 'var(--text)'};">
              {formatCurrency(total, entity.currency || 'EUR')}
            </div>
            <div class="text-[10px] mono w-12 text-right" style="color: var(--text3);">
              {pct}%
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else if data.entityComparison && data.entityComparison.length === 1}
    <div class="stat-card mb-6">
      <div class="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3" style="color: var(--text3);">Entity Overview</div>
      {#each data.entityComparison as entity}
        <div class="flex items-center justify-between">
          <div>
            <div class="text-lg font-bold" style="color: var(--text);">{entity.name}</div>
            <div class="text-[10px]" style="color: var(--text3);">{entity.accountCount} account{entity.accountCount !== 1 ? 's' : ''}</div>
          </div>
          <div class="text-right">
            <div class="text-xl font-bold mono" style="color: var(--gold);">{formatCurrency(entity.total, entity.currency || 'EUR')}</div>
          </div>
        </div>
      {/each}
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
              <th class="th-account">Account</th>
              <th class="th-entity">Entity</th>
              <th class="th-type">Type</th>
              <th class="th-balance">Balance</th>
              <th class="th-updated">Updated</th>
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
                <td class="td-entity">{entity.name}</td>
                <td class="td-type"><span class="badge {cfg.badge}">{cfg.icon}</span></td>
                <td style="text-align: right;" class="mono font-semibold td-balance">
                  {#if latestBalance}
                    <span style="color: {isNegative ? 'var(--red)' : 'var(--gold)'};">
                      {formatNumber(latestBalance.balance)}
                    </span>
                  {:else}
                    <span style="color: var(--text3);">—</span>
                  {/if}
                </td>
                <td style="text-align: right; color: var(--text3);" class="td-updated">{latestBalance ? formatDateShort(latestBalance.date) : '—'}</td>
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

  /* Mobile table: compact columns */
  .th-account { width: 30%; }
  .th-entity  { width: 20%; }
  .th-type    { width: 15%; }
  .th-balance { width: 25%; text-align: right !important; }
  .th-updated { width: 10%; text-align: right !important; }
  .td-entity  { color: var(--text3); font-size: 11px; }
  .td-type    { }
  .td-balance { font-size: 11px; }
  .td-updated { font-size: 10px; }

  @media (max-width: 767px) {
    .data-table { table-layout: fixed; }
    .th-entity  { display: none; }
    .td-entity  { display: none; }
  }
</style>
