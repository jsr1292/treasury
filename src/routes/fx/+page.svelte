<script>
  let { data } = $props();
  let rates = $derived(data.rates || []);
  let fetching = $state(false);
  let fetchResult = $state(null);

  async function fetchECB() {
    fetching = true;
    fetchResult = null;
    try {
      const res = await fetch('/api/fx/fetch', { method: 'POST' });
      const data = await res.json();
      fetchResult = data;
      if (data.ok) {
        // Reload page to show new rates
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch {
      fetchResult = { error: 'Network error' };
    }
    fetching = false;
  }

  import { formatNumber } from '$lib/format';
  const fmt = (n) => formatNumber(n, undefined); // 2 decimals by default
  const fmt4 = (n) => parseFloat(n).toFixed(4); // FX rates need 4 decimals
</script>

<svelte:head>
  <title>FX Rates — Treasury</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <div class="text-[10px] uppercase tracking-[0.12em] mb-1" style="color: var(--text3);">Currency exchange</div>
      <h1 class="text-2xl font-bold" style="color: var(--gold);">💱 FX Rates</h1>
    </div>
    <button onclick={fetchECB} disabled={fetching}
      class="px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
      style="background: linear-gradient(135deg, var(--gold), #b8943f); color: var(--bg-dark);">
      {fetching ? 'Fetching...' : '↻ ECB Rates'}
    </button>
  </div>

  <!-- Fetch result -->
  {#if fetchResult}
    <div class="stat-card mb-4" style="border-color: {fetchResult.ok ? 'rgba(0,229,160,0.3)' : 'rgba(255,77,106,0.3)'};">
      {#if fetchResult.ok}
        <div class="text-xs" style="color: var(--green);">✓ {fetchResult.inserted} rates fetched for {fetchResult.date}</div>
      {:else}
        <div class="text-xs" style="color: var(--red);">✗ {fetchResult.error || 'Failed to fetch'}</div>
      {/if}
    </div>
  {/if}

  {#if rates.length > 0}
    <!-- Latest rates table -->
    <div class="stat-card mb-4">
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] mb-3" style="color: var(--text3);">
        Latest · {new Date(rates[0]?.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
      <div class="grid grid-cols-3 gap-2">
        {#each rates.filter((r, i, arr) => arr.findIndex(x => x.toCurrency === r.toCurrency) === i).slice(0, 30) as rate}
          <div class="flex items-center justify-between px-3 py-2 rounded-lg" style="background: rgba(255,255,255,0.02);">
            <span class="text-xs font-bold" style="color: var(--text);">EUR/{rate.toCurrency}</span>
            <span class="text-xs mono" style="color: var(--gold);">{fmt4(rate.rate)}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Rate history -->
    <div>
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] mb-3" style="color: var(--text3);">History</div>
      <div class="space-y-1">
        {#each rates.slice(0, 20) as rate}
          <div class="flex items-center gap-3 px-3 py-2 rounded-lg" style="background: rgba(255,255,255,0.02);">
            <span class="text-xs mono" style="color: var(--text3);">{new Date(rate.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            <span class="text-xs font-medium" style="color: var(--text);">EUR → {rate.toCurrency}</span>
            <span class="flex-1"></span>
            <span class="text-xs mono font-bold" style="color: var(--gold);">{fmt4(rate.rate)}</span>
            <span class="text-[10px]" style="color: var(--text3);">{rate.source}</span>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="stat-card text-center py-12">
      <div class="text-3xl mb-3">💱</div>
      <div style="color: var(--text3); font-size: 12px;" class="mb-3">No FX rates loaded</div>
      <div style="color: var(--text3); font-size: 10px;">Click "↻ ECB Rates" to fetch today's rates from the European Central Bank</div>
    </div>
  {/if}
</div>
