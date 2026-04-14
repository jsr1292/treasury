<script>
  let { data } = $props();

  const typeIcons = { bank: '🏦', savings: '💰', deposit: '📋', bond: '📜', other: '💳' };
</script>

<svelte:head>
  <title>Accounts — Treasury</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-6">
  <h1 class="text-2xl font-black mb-1">🏦 Accounts</h1>
  <p class="text-sm text-[var(--text-secondary)] mb-6">All financial accounts across entities</p>

  {#if data.accounts.length > 0}
    <div class="space-y-2">
      {#each data.accounts as { account, entity }}
        <a href="/accounts/{account.id}"
          class="flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl hover:border-[var(--accent)]/30 transition-colors">
          <div class="text-lg">{typeIcons[account.type] || '💳'}</div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-sm truncate">{account.name}</div>
            <div class="text-xs text-[var(--text-secondary)]">{entity.name} · {account.currency}{#if account.bankName} · {account.bankName}{/if}</div>
          </div>
          <div class="text-xs text-[var(--text-secondary)]">
            {#if account.isActive}✅{:else}⏸️{/if}
          </div>
        </a>
      {/each}
    </div>
  {:else}
    <div class="text-center py-12 text-[var(--text-secondary)]">
      <div class="text-4xl mb-3">🏦</div>
      <p>No accounts yet. Create an entity first, then add accounts.</p>
    </div>
  {/if}
</div>
