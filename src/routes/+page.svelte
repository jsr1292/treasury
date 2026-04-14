<script>
  let { data } = $props();

  function fmt(n) {
    if (!n) return '—';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(n));
  }

  function fmtCurrency(amount, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'EUR' }).format(amount);
  }

  let totalAccounts = $derived(data.balances.length);
  let accountsWithBalance = $derived(data.balances.filter(b => b.latestBalance).length);
  let activeAnomalies = $derived(data.anomalies.length);
</script>

<svelte:head>
  <title>Treasury — Dashboard</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-6">
  <!-- Header -->
  <div class="mb-6">
    <h1 class="text-3xl font-black mb-1">📊 Treasury</h1>
    <p class="text-sm text-[var(--text-secondary)]">Cash position across all entities</p>
  </div>

  <!-- Totals by currency -->
  {#if Object.keys(data.totalsByCurrency).length > 0}
    <div class="grid grid-cols-2 gap-3 mb-6">
      {#each Object.entries(data.totalsByCurrency) as [currency, total]}
        <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
          <div class="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">Total {currency}</div>
          <div class="text-2xl font-black mono {currency === 'EUR' ? 'text-[var(--accent)]' : 'text-[var(--green)]'}">
            {fmtCurrency(total, currency)}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-center mb-6">
      <div class="text-4xl mb-3">🏦</div>
      <p class="text-[var(--text-secondary)] mb-1">No balances recorded yet</p>
      <p class="text-xs text-[var(--text-secondary)]">Create an entity and add accounts to get started</p>
    </div>
  {/if}

  <!-- Quick stats -->
  <div class="grid grid-cols-3 gap-3 mb-6">
    <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 text-center">
      <div class="text-xl font-black text-[var(--accent)]">{totalAccounts}</div>
      <div class="text-[10px] text-[var(--text-secondary)] uppercase">Accounts</div>
    </div>
    <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 text-center">
      <div class="text-xl font-black text-[var(--green)]">{accountsWithBalance}</div>
      <div class="text-[10px] text-[var(--text-secondary)] uppercase">With Balance</div>
    </div>
    <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 text-center">
      <div class="text-xl font-black {activeAnomalies > 0 ? 'text-[var(--red)]' : 'text-[var(--green)]'}">{activeAnomalies}</div>
      <div class="text-[10px] text-[var(--text-secondary)] uppercase">Anomalies</div>
    </div>
  </div>

  <!-- Anomalies -->
  {#if data.anomalies.length > 0}
    <div class="mb-6">
      <h2 class="text-sm font-bold text-[var(--red)] uppercase tracking-wider mb-3">⚠️ Anomalies</h2>
      <div class="space-y-2">
        {#each data.anomalies as anomaly}
          <div class="px-4 py-3 bg-red-950/30 border border-red-500/20 rounded-xl">
            <div class="flex items-center gap-2">
              <span class="text-sm">{anomaly.severity === 'critical' ? '🔴' : '🟡'}</span>
              <span class="text-sm font-medium">{anomaly.message}</span>
            </div>
            <div class="text-xs text-[var(--text-secondary)] mt-1">{new Date(anomaly.createdAt).toLocaleDateString()}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Account balances -->
  {#if data.balances.length > 0}
    <div>
      <h2 class="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Account Balances</h2>
      <div class="space-y-2">
        {#each data.balances as { account, entity, latestBalance }}
          <a href="/accounts/{account.id}"
            class="flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/30 transition-colors">
            <!-- Type icon -->
            <div class="text-lg">
              {#if account.type === 'bank'}🏦
              {:else if account.type === 'savings'}💰
              {:else if account.type === 'deposit'}📋
              {:else if account.type === 'bond'}📜
              {:else}💳
              {/if}
            </div>
            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm truncate">{account.name}</div>
              <div class="text-xs text-[var(--text-secondary)]">{entity.name} · {account.currency}</div>
            </div>
            <!-- Balance -->
            <div class="text-right">
              {#if latestBalance}
                <div class="font-black mono text-sm">{fmt(latestBalance.balance)}</div>
                <div class="text-[10px] text-[var(--text-secondary)]">{latestBalance.currency} · {new Date(latestBalance.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              {:else}
                <div class="text-xs text-[var(--text-secondary)]">No data</div>
              {/if}
            </div>
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>
