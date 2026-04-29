<script>
  import { formatNumber, formatCurrency, formatDate, formatDateShort } from '$lib/format';
  import { ACCOUNT_TYPES } from '$lib/constants';
  let { data } = $props();

  let account = $derived(data.account || {});
  let entity = $derived(data.entity || { name: '—' });
  let balances = $derived(data.balances || []);
  let stats = $derived(data.stats);
  let anomalies = $derived(data.anomalies || []);

  let showBalanceForm = $state(false);
  let balanceDate = $state(new Date().toISOString().split('T')[0]);
  let balanceAmount = $state('');
  let balanceNotes = $state('');
  let submitting = $state(false);

  const typeIcons = { bank: '🏦', savings: '💰', deposit: '📋', bond: '📜', other: '💳' };
  const typeLabels = { bank: 'Bank Account', savings: 'Savings', deposit: 'Deposit', bond: 'Bond', other: 'Other' };

  async function handleBalance(e) {
    e.preventDefault();
    submitting = true;
    const res = await fetch('/api/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id,
        date: balanceDate,
        balance: balanceAmount,
        currency: account.currency,
        notes: balanceNotes,
      }),
    });
    if (res.ok) {
      window.__toast?.('Balance entry saved');
      setTimeout(() => window.location.reload(), 600);
    } else {
      window.__toast?.('Failed to save balance', 'error');
    }
    submitting = false;
  }

  // Sparkline — simple ASCII/box-drawing trend
  let sparkline = $derived(() => {
    if (balances.length < 2) return '';
    const reversed = [...balances].reverse();
    const values = reversed.map(b => parseFloat(b.balance));
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const chars = ['▁','▂','▃','▄','▅','▆','▇','█'];
    return values.map(v => {
      const idx = Math.min(chars.length - 1, Math.floor(((v - min) / range) * chars.length));
      return chars[idx];
    }).join('');
  });

  // Chart data for simple bar chart
  let chartBars = $derived(() => {
    if (balances.length < 2) return [];
    const reversed = [...balances].reverse();
    const values = reversed.map(b => parseFloat(b.balance));
    const max = Math.max(...values);
    return reversed.map((b, i) => ({
      date: formatDateShort(b.date),
      value: parseFloat(b.balance),
      height: max > 0 ? (parseFloat(b.balance) / max * 100) : 0,
    }));
  });
</script>

<svelte:head>
  <title>{account?.name || 'Account'} — Treasury</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-6">
  {#if account}
    <a href="/accounts" class="text-xs" style="color: var(--text3); letter-spacing: 0.1em;">← ACCOUNTS</a>

    <!-- Header -->
    <div class="mt-3 mb-6">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-lg">{typeIcons[account.type] || '💳'}</span>
        <span class="badge {account.type === 'bank' ? 'badge-blue' : account.type === 'deposit' ? 'badge-green' : account.type === 'bond' ? 'badge-gold' : 'badge-gold'}">{ACCOUNT_TYPES[account.type]?.icon} {typeLabels[account.type] || account.type}</span> · {account.currency}
      </div>
      <h1 class="text-2xl font-bold" style="color: var(--text);">{account.name}</h1>
      <div class="text-xs mt-1" style="color: var(--text3);">
        {entity.name}
        {#if account.bankName} · {account.bankName}{/if}
        {#if account.accountNumber} · <span class="mono">{account.accountNumber}</span>{/if}
      </div>
    </div>

    <!-- Current balance + sparkline -->
    <div class="stat-card mb-6">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase tracking-[0.12em] mb-1" style="color: var(--text3);">Current Balance</div>
          <div class="text-3xl font-bold mono" style="color: var(--gold);">
            <span style="color: {stats.latestBalance < 0 ? 'var(--red)' : 'var(--gold)'};">{formatCurrency(stats.latestBalance, account.currency)}</span>
          </div>
          {#if stats.totalEntries > 1}
            <div class="text-xs mt-1" style="color: {stats.totalChange >= 0 ? 'var(--green)' : 'var(--red)'};">
              {stats.totalChange >= 0 ? '▲' : '▼'} {formatNumber(Math.abs(stats.totalChange))} {account.currency} total change
            </div>
          {/if}
        </div>
        <div class="text-right">
          <div class="text-2xl mono" style="color: var(--text3); letter-spacing: -1px;">{sparkline()}</div>
          <div class="text-[10px] mt-1" style="color: var(--text3);">{stats.totalEntries} entries</div>
        </div>
      </div>
    </div>

    <!-- Stats row -->
    {#if stats.totalEntries > 0}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div class="stat-card">
          <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Highest</div>
          <div class="text-sm font-bold mono" style="color: var(--green);">{formatNumber(stats.maxBalance)}</div>
        </div>
        <div class="stat-card">
          <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Lowest</div>
          <div class="text-sm font-bold mono" style="color: var(--red);">{formatNumber(stats.minBalance)}</div>
        </div>
        <div class="stat-card">
          <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">First Entry</div>
          <div class="text-sm font-bold" style="color: var(--text);">{stats.firstDate ? formatDate(stats.firstDate) : '—'}</div>
        </div>
        <div class="stat-card">
          <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Last Entry</div>
          <div class="text-sm font-bold" style="color: var(--text);">{stats.lastDate ? formatDate(stats.lastDate) : '—'}</div>
        </div>
      </div>

      <!-- Balance trend chart -->
      <div class="stat-card mb-6">
        <div class="text-[10px] uppercase tracking-[0.12em] mb-3" style="color: var(--text3);">Balance Trend</div>
        <div class="flex items-end gap-px h-32 overflow-hidden">
          {#each chartBars() as bar, i}
            <div class="flex-1 flex flex-col items-center justify-end min-w-0" style="height: 100%;">
              <div
                class="w-full rounded-t-sm transition-colors"
                style="height: {bar.height}%; background: {bar.value === stats.maxBalance ? 'var(--green)' : bar.value === stats.minBalance ? 'var(--red)' : 'rgba(201,168,76,0.4)'}; min-height: 2px;"
                title="{bar.date}: {formatNumber(bar.value)}"
              ></div>
            </div>
          {/each}
        </div>
        {#if balances.length > 0}
          <div class="flex justify-between mt-1">
            <span class="text-[9px]" style="color: var(--text3);">{formatDateShort(balances[balances.length - 1].date)}</span>
            <span class="text-[9px]" style="color: var(--text3);">{formatDateShort(balances[0].date)}</span>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Anomalies -->
    {#if anomalies.length > 0}
      <div class="mb-6">
        <div class="text-[10px] font-bold uppercase tracking-[0.12em] mb-3" style="color: var(--red);">⚠ Anomalies ({anomalies.length})</div>
        <div class="space-y-2">
          {#each anomalies as anomaly}
            <div class="stat-card" style="border-color: {anomaly.severity === 'critical' ? 'rgba(255,77,106,0.3)' : 'rgba(255,215,10,0.2)'};">
              <div class="flex items-center gap-2">
                <span>{anomaly.severity === 'critical' ? '🔴' : '🟡'}</span>
                <span class="text-xs" style="color: var(--text);">{anomaly.message}</span>
              </div>
              <div class="text-[10px] mt-1" style="color: var(--text3);">
                {#if !anomaly.isResolved}
                  <span style="color: var(--red);">UNRESOLVED</span> ·
                {:else}
                  <span style="color: var(--green);">RESOLVED</span> ·
                {/if}
                {formatDate(anomaly.createdAt)}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Add balance -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <div class="text-[10px] font-bold uppercase tracking-[0.12em]" style="color: var(--text3);">Balance History</div>
        <button onclick={() => showBalanceForm = !showBalanceForm}
          class="text-[10px] font-bold tracking-[0.1em] px-3 py-1.5 rounded-lg"
          style="color: var(--gold); background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.2);">
          {showBalanceForm ? 'CANCEL' : '+ ENTRY'}
        </button>
      </div>

      {#if showBalanceForm}
        <div class="glass rounded-xl p-4 mb-4" style="border: 1px solid rgba(201,168,76,0.3);">
          <form onsubmit={handleBalance} class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label" for="bdate">Date</label>
                <input id="bdate" type="date" bind:value={balanceDate} required class="input" />
              </div>
              <div>
                <label class="label" for="bamt">Balance ({account.currency})</label>
                <input id="bamt" type="text" bind:value={balanceAmount} placeholder="15000,00" required class="input mono" />
              </div>
            </div>
            <div>
              <label class="label" for="bnotes">Notes</label>
              <input id="bnotes" type="text" bind:value={balanceNotes} placeholder="End of month balance" class="input" />
            </div>
            <button type="submit" disabled={submitting}
              class="w-full py-3 rounded-lg text-xs font-bold btn-gold disabled:opacity-40">
              {submitting ? 'Saving...' : 'Save Balance'}
            </button>
          </form>
        </div>
      {/if}

      {#if balances.length > 0}
        <div class="space-y-1">
          {#each balances as balance, i}
            {@const change = i < balances.length - 1 ? parseFloat(balance.balance) - parseFloat(balances[i + 1].balance) : 0}
            <div class="flex items-center gap-3 px-3 py-2 rounded-lg" style="background: rgba(255,255,255,{i === 0 ? '0.04' : '0.01'});">
              <span class="text-xs mono w-20" style="color: var(--text3);">{formatDateShort(balance.date)}</span>
              <span class="text-sm font-bold mono flex-1 text-right" style="color: {i === 0 ? 'var(--gold)' : 'var(--text)'};">
                {formatNumber(balance.balance)}
              </span>
              <span class="text-[10px] mono w-20 text-right" style="color: {change >= 0 ? 'var(--green)' : 'var(--red)'};">
                {change !== 0 ? `${change >= 0 ? '+' : ''}${formatNumber(change)}` : '—'}
              </span>
              <span class="text-[10px] w-16 text-right" style="color: var(--text3);">{balance.source}</span>
            </div>
          {/each}
        </div>
      {:else}
        <div class="stat-card text-center py-8">
          <div style="color: var(--text3); font-size: 12px;">No balance entries yet. Click "+ ENTRY" to add one.</div>
        </div>
      {/if}
    </div>

    <!-- Account details -->
    {#if account.maturityDate || account.interestRate}
      <div class="stat-card">
        <div class="text-[10px] uppercase tracking-[0.12em] mb-2" style="color: var(--text3);">Instrument Details</div>
        {#if account.interestRate}
          <div class="text-sm mb-1"><span style="color: var(--text3);">Interest Rate:</span> <span class="font-bold mono" style="color: var(--gold);">{account.interestRate}%</span></div>
        {/if}
        {#if account.maturityDate}
          <div class="text-sm"><span style="color: var(--text3);">Maturity:</span> <span class="font-bold" style="color: var(--text);">{formatDate(account.maturityDate)}</span></div>
        {/if}
      </div>
    {/if}
  {:else}
    <div class="stat-card text-center py-12">
      <div style="color: var(--text3);">Account not found</div>
    </div>
  {/if}
</div>
