<script>
  import { formatNumber, formatCurrency, formatDate, formatDateShort } from '$lib/format';
  let { data } = $props();

  let instruments = $derived(data.instruments || []);
  let totalDeposits = $derived(data.totalDeposits || 0);
  let totalBonds = $derived(data.totalBonds || 0);
  let totalYield = $derived(data.totalYield || 0);
  let filter = $state('all'); // 'all', 'deposit', 'bond', 'maturity'

  let filtered = $derived(() => {
    if (filter === 'deposit') return instruments.filter(i => i.account.type === 'deposit');
    if (filter === 'bond') return instruments.filter(i => i.account.type === 'bond');
    if (filter === 'maturity') return instruments.filter(i => i.isNearMaturity || i.isMatured);
    return instruments;
  });

  let upcomingMaturities = $derived(() =>
    instruments.filter(i => i.daysToMaturity !== null && i.daysToMaturity > 0 && i.daysToMaturity <= 90)
      .sort((a, b) => a.daysToMaturity - b.daysToMaturity)
  );
</script>

<svelte:head>
  <title>Instruments — Treasury</title>
</svelte:head>

<div class="max-w-4xl mx-auto px-6 py-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <div class="text-[10px] uppercase tracking-[0.12em] mb-1" style="color: var(--text3);">Investments</div>
      <h1 class="text-2xl font-bold" style="color: var(--gold);">📋 Instruments</h1>
    </div>
  </div>

  <!-- Summary cards -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
    <div class="stat-card">
      <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Deposits</div>
      <div class="text-lg font-bold mono" style="color: var(--text);">{formatNumber(totalDeposits)}</div>
    </div>
    <div class="stat-card">
      <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Bonds</div>
      <div class="text-lg font-bold mono" style="color: var(--text);">{formatNumber(totalBonds)}</div>
    </div>
    <div class="stat-card">
      <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Total Invested</div>
      <div class="text-lg font-bold mono" style="color: var(--gold);">{formatNumber(totalDeposits + totalBonds)}</div>
    </div>
    <div class="stat-card">
      <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Annual Yield</div>
      <div class="text-lg font-bold mono" style="color: var(--green);">{formatNumber(totalYield)}</div>
    </div>
  </div>

  <!-- Upcoming maturities -->
  {#if upcomingMaturities().length > 0}
    <div class="stat-card mb-6" style="border-color: rgba(255,215,10,0.3);">
      <div class="text-[10px] font-bold uppercase tracking-[0.12em] mb-3" style="color: #ffd70a;">⏰ Upcoming Maturities</div>
      <div class="space-y-2">
        {#each upcomingMaturities() as item}
          <div class="flex items-center gap-3">
            <span class="text-sm">{item.account.type === 'deposit' ? '📋' : '📜'}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold truncate" style="color: var(--text);">{item.account.name}</div>
              <div class="text-[10px]" style="color: var(--text3);">{item.entity.name}</div>
            </div>
            <div class="text-right">
              <div class="text-xs font-bold" style="color: {item.isMatured ? 'var(--red)' : item.daysToMaturity <= 14 ? '#ffd70a' : 'var(--text)'};">
                {item.isMatured ? 'MATURED' : `${item.daysToMaturity}d`}
              </div>
              <div class="text-[10px]" style="color: var(--text3);">{formatDateShort(item.account.maturityDate)}</div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Filter tabs -->
  <div class="flex gap-2 mb-4">
    {#each [
      { id: 'all', label: 'All', count: instruments.length },
      { id: 'deposit', label: '📋 Deposits', count: instruments.filter(i => i.account.type === 'deposit').length },
      { id: 'bond', label: '📜 Bonds', count: instruments.filter(i => i.account.type === 'bond').length },
    ] as tab}
      <button onclick={() => filter = tab.id}
        class="px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-[0.08em] transition-colors"
        style="color: {filter === tab.id ? 'var(--gold)' : 'var(--text3)'}; background: {filter === tab.id ? 'rgba(201,168,76,0.1)' : 'transparent'}; border: 1px solid {filter === tab.id ? 'rgba(201,168,76,0.2)' : 'var(--glass-border)'};">
        {tab.label} ({tab.count})
      </button>
    {/each}
  </div>

  <!-- Instruments list -->
  {#if filtered().length > 0}
    <div class="space-y-3">
      {#each filtered() as item}
        <a href="/accounts/{item.account.id}" class="stat-card block no-underline" style="border-left: 3px solid {item.account.type === 'deposit' ? 'var(--green)' : 'var(--gold)'};">
          <div class="flex items-start justify-between mb-2">
            <div>
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-sm">{item.account.type === 'deposit' ? '📋' : '📜'}</span>
                <span class="text-[10px] uppercase font-bold tracking-[0.1em]" style="color: {item.account.type === 'deposit' ? 'var(--green)' : 'var(--gold)'};">
                  {item.account.type}
                </span>
                {#if item.isMatured}
                  <span class="text-[10px] px-1.5 py-0.5 rounded" style="background: rgba(255,77,106,0.15); color: var(--red);">MATURED</span>
                {:else if item.isNearMaturity}
                  <span class="text-[10px] px-1.5 py-0.5 rounded" style="background: rgba(255,215,10,0.15); color: #ffd70a;">{item.daysToMaturity}d LEFT</span>
                {/if}
              </div>
              <div class="text-sm font-bold" style="color: var(--text);">{item.account.name}</div>
              <div class="text-[10px]" style="color: var(--text3);">{item.entity.name}{#if item.account.bankName} · {item.account.bankName}{/if}</div>
            </div>
            <div class="text-right">
              <div class="text-lg font-bold mono" style="color: var(--gold);">
                {item.latestBalance ? formatNumber(item.latestBalance.balance) : '—'}
              </div>
              <div class="text-[10px]" style="color: var(--text3);">{item.account.currency}</div>
            </div>
          </div>

          <!-- Instrument details bar -->
          <div class="flex items-center gap-4 pt-2" style="border-top: 1px solid var(--glass-border);">
            {#if item.account.interestRate}
              <div>
                <div class="text-[9px] uppercase" style="color: var(--text3);">Rate</div>
                <div class="text-xs font-bold mono" style="color: var(--green);">{item.account.interestRate}%</div>
              </div>
            {/if}
            {#if item.account.maturityDate}
              <div>
                <div class="text-[9px] uppercase" style="color: var(--text3);">Maturity</div>
                <div class="text-xs font-bold" style="color: var(--text);">{formatDate(item.account.maturityDate)}</div>
              </div>
            {/if}
            {#if item.annualYield > 0}
              <div>
                <div class="text-[9px] uppercase" style="color: var(--text3);">Annual Yield</div>
                <div class="text-xs font-bold mono" style="color: var(--green);">+{formatNumber(item.annualYield)}</div>
              </div>
            {/if}
            {#if item.dailyYield > 0}
              <div>
                <div class="text-[9px] uppercase" style="color: var(--text3);">Daily</div>
                <div class="text-xs font-bold mono" style="color: var(--green);">+{formatNumber(item.dailyYield)}</div>
              </div>
            {/if}
          </div>
        </a>
      {/each}
    </div>
  {:else}
    <div class="stat-card text-center py-12">
      <div class="text-3xl mb-3">📋</div>
      <div style="color: var(--text3); font-size: 12px;" class="mb-2">No investment instruments</div>
      <div style="color: var(--text3); font-size: 10px;">
        Add accounts with type "Deposit" or "Bond" from any entity page to track them here.
      </div>
    </div>
  {/if}
</div>
