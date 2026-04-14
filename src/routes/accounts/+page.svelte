<script>
  let { data } = $props();
  const typeIcons = { bank: '🏦', savings: '💰', deposit: '📋', bond: '📜', other: '💳' };
</script>

<svelte:head>
  <title>Accounts — Treasury</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-6">
  <div class="mb-6">
    <div class="text-[10px] uppercase tracking-[0.12em] mb-1" style="color: var(--text3);">Financial instruments</div>
    <h1 class="text-2xl font-bold" style="color: var(--gold);">🏦 Accounts</h1>
  </div>

  {#if data.accounts.length > 0}
    <div class="space-y-2">
      {#each data.accounts as { account, entity }}
        <a href="/accounts/{account.id}" class="account-row block no-underline">
          <div class="text-base">{typeIcons[account.type] || '💳'}</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold truncate" style="color: var(--text);">{account.name}</div>
            <div class="text-[10px]" style="color: var(--text3);">{entity.name} · {account.currency}{#if account.bankName} · {account.bankName}{/if}</div>
          </div>
          <div class="text-[10px]" style="color: {account.isActive ? 'var(--green)' : 'var(--text3)'};">
            {account.isActive ? 'ACTIVE' : 'INACTIVE'}
          </div>
        </a>
      {/each}
    </div>
  {:else}
    <div class="stat-card text-center py-12">
      <div class="text-3xl mb-3">🏦</div>
      <div style="color: var(--text3); font-size: 12px;">No accounts yet. Create an entity first, then add accounts.</div>
    </div>
  {/if}
</div>
