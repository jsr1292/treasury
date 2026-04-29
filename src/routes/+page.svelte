<script>
  import { formatCurrency } from '$lib/format';

  let { data } = $props();

  let totalBalance = $derived(data.summaryStats?.totalBalance || 0);
  let entityCount = $derived(data.entities?.length || 0);
  let accountCount = $derived(data.accounts?.length || 0);
  let bankCount = $derived(data.summaryStats?.bankCount || 0);
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
        {:else}
          Data will appear here once your connector is configured.
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
    <a href="/entities" class="stat-card no-underline" style="padding: 12px; text-align: center; cursor: pointer;">
      <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text3); margin-bottom: 4px;">Explore</div>
      <div style="font-size: 18px; color: var(--gold);">→</div>
    </a>
  </div>

  {/if}
</div>
