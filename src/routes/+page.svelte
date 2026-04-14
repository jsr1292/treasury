<script>
  let { data } = $props();

  function fmt(n) {
    if (!n) return '—';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(n));
  }

  function fmtCurrency(amount, currency) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'EUR' }).format(amount);
  }
</script>

<svelte:head>
  <title>Treasury — Dashboard</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-6">
  <!-- Header -->
  <div class="mb-6">
    <div class="text-[10px] uppercase tracking-[0.15em] mb-2" style="color: var(--text3);">Cash Position</div>
    <h1 class="text-2xl font-bold" style="color: var(--gold);">📊 Treasury</h1>
  </div>

  <!-- Totals by currency -->
  {#if Object.keys(data.totalsByCurrency).length > 0}
    <div class="grid gap-3 mb-6" style="grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));">
      {#each Object.entries(data.totalsByCurrency) as [currency, total]}
        <div class="stat-card">
          <div class="text-[10px] uppercase tracking-[0.12em] mb-1" style="color: var(--text3);">Total {currency}</div>
          <div class="text-xl font-bold mono" style="color: {currency === 'EUR' ? 'var(--gold)' : 'var(--green)'};">
            {fmtCurrency(total, currency)}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="stat-card text-center py-8 mb-6">
      <div class="text-3xl mb-3">🏦</div>
      <div style="color: var(--text3); font-size: 12px;">No balances recorded yet</div>
      <div style="color: var(--text3); font-size: 10px; margin-top: 4px;">Create an entity and add accounts to get started</div>
    </div>
  {/if}

  <!-- Quick stats -->
  <div class="grid grid-cols-3 gap-3 mb-6">
    <div class="stat-card text-center">
      <div class="text-xl font-bold" style="color: var(--blue);">{data.balances.length}</div>
      <div class="text-[10px] uppercase tracking-[0.1em]" style="color: var(--text3);">Accounts</div>
    </div>
    <div class="stat-card text-center">
      <div class="text-xl font-bold" style="color: var(--green);">{data.balances.filter(b => b.latestBalance).length}</div>
      <div class="text-[10px] uppercase tracking-[0.1em]" style="color: var(--text3);">Balanced</div>
    </div>
    <div class="stat-card text-center">
      <div class="text-xl font-bold" style="color: {data.anomalies.length > 0 ? 'var(--red)' : 'var(--green)'};">{data.anomalies.length}</div>
      <div class="text-[10px] uppercase tracking-[0.1em]" style="color: var(--text3);">Anomalies</div>
    </div>
  </div>

  <!-- Anomalies -->
  {#if data.anomalies.length > 0}
    <div class="mb-6">
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] mb-3" style="color: var(--red);">⚠ Anomalies</div>
      <div class="space-y-2">
        {#each data.anomalies as anomaly}
          <div class="stat-card" style="border-color: rgba(255, 77, 106, 0.2);">
            <div class="flex items-center gap-2">
              <span class="text-sm">{anomaly.severity === 'critical' ? '🔴' : '🟡'}</span>
              <span class="text-xs" style="color: var(--text);">{anomaly.message}</span>
            </div>
            <div class="text-[10px] mt-1" style="color: var(--text3);">{new Date(anomaly.createdAt).toLocaleDateString()}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Account balances -->
  {#if data.balances.length > 0}
    <div>
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] mb-3" style="color: var(--text3);">Account Balances</div>
      <div class="space-y-2">
        {#each data.balances as { account, entity, latestBalance }}
          <a href="/accounts/{account.id}" class="account-row block no-underline">
            <div class="text-base">
              {#if account.type === 'bank'}🏦{:else if account.type === 'savings'}💰{:else if account.type === 'deposit'}📋{:else if account.type === 'bond'}📜{:else}💳{/if}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold truncate" style="color: var(--text);">{account.name}</div>
              <div class="text-[10px]" style="color: var(--text3);">{entity.name} · {account.currency}</div>
            </div>
            <div class="text-right">
              {#if latestBalance}
                <div class="text-sm font-bold mono" style="color: var(--gold);">{fmt(latestBalance.balance)}</div>
                <div class="text-[10px]" style="color: var(--text3);">{latestBalance.currency} · {new Date(latestBalance.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
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
