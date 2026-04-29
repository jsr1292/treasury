<script>
  import { formatNumber, formatDateShort } from '$lib/format';
  let { data } = $props();
  let balances = $derived(data.balances || []);

  function downloadCsv() {
    window.open('/api/balances/export', '_blank');
  }
</script>

<svelte:head>
  <title>Balances — Treasury</title>
</svelte:head>

<div class="max-w-6xl mx-auto page-desktop">
  <div class="flex items-center justify-between mb-6">
    <div>
      <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Cash Position</div>
      <h1 class="text-xl font-bold" style="color: var(--text);">Balances</h1>
    </div>
    {#if balances.length > 0}
      <button onclick={downloadCsv}
        class="px-4 py-2 rounded-lg text-xs font-bold"
        style="color: var(--gold); background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.2);">
        ↓ Export CSV
      </button>
    {/if}
  </div>

  {#if balances.length > 0}
    <!-- Desktop table -->
    <div class="stat-card hidden md:block" style="padding: 0; overflow: hidden;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Account</th>
            <th>Entity</th>
            <th>Bank</th>
            <th>Currency</th>
            <th style="text-align: right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          {#each balances as row}
            {@const isNegative = row.balance < 0}
            <tr>
              <td class="mono" style="color: var(--text3);">{formatDateShort(row.date)}</td>
              <td style="color: var(--text); font-weight: 500;">{row.accountName}</td>
              <td style="color: var(--text3);">{row.entityName}</td>
              <td style="color: var(--text3);">{row.bankName || '—'}</td>
              <td class="mono" style="color: var(--text3);">{row.currency}</td>
              <td style="text-align: right;" class="mono font-semibold">
                <span style="color: {isNegative ? 'var(--red)' : 'var(--gold)'};">
                  {formatNumber(row.balance)}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile cards -->
    <div class="md:hidden space-y-2">
      {#each balances as row}
        {@const isNegative = row.balance < 0}
        <div class="stat-card">
          <div class="flex items-center justify-between mb-1">
            <div class="text-sm font-semibold" style="color: var(--text);">{row.accountName}</div>
            <div class="text-sm font-bold mono" style="color: {isNegative ? 'var(--red)' : 'var(--gold)'};">
              {formatNumber(row.balance)}
            </div>
          </div>
          <div class="text-[10px]" style="color: var(--text3);">
            {formatDateShort(row.date)} · {row.entityName} · {row.currency}
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="stat-card text-center py-12">
      <div class="text-3xl mb-3">📊</div>
      <div style="color: var(--text3); font-size: 12px;">No balance data available.</div>
      <div style="color: var(--text3); font-size: 10px; margin-top: 4px;">
        Balance entries will appear here once loaded from the API.
      </div>
    </div>
  {/if}
</div>
