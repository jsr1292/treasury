<script lang="ts">
  interface TrendPoint { date: string; balance: number; currency: string; }
  let { balances, accountId }: { balances: TrendPoint[]; accountId: string } = $props();

  let data = $derived(balances?.filter((b: TrendPoint) => b.date) ?? []);
  let maxVal = $derived(Math.max(...data.map((d: TrendPoint) => d.balance), 0));
  let minVal = $derived(Math.min(...data.map((d: TrendPoint) => d.balance), 0));
  let range = $derived(maxVal - minVal || 1);

  let width = $state(600);
  let height = 160;
  let padding = { top: 12, right: 12, bottom: 28, left: 12 };

  let container;

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function xPos(dateStr: string) {
    if (data.length < 2) return padding.left;
    const d = new Date(dateStr + 'T00:00:00').getTime();
    const first = new Date(data[0].date + 'T00:00:00').getTime();
    const last = new Date(data[data.length - 1].date + 'T00:00:00').getTime();
    const span = last - first || 1;
    return padding.left + ((d - first) / span) * (width - padding.left - padding.right);
  }

  function yPos(val: number) {
    return padding.top + ((maxVal - val) / range) * (height - padding.top - padding.bottom);
  }

  let pathD = $derived(() => {
    if (data.length < 2) return '';
    return data.map((d, i) => {
      const x = xPos(d.date);
      const y = yPos(d.balance);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  });

  let areaD = $derived(() => {
    if (data.length < 2) return '';
    const line = pathD();
    const last = data[data.length - 1];
    const first = data[0];
    return `${line} L${xPos(last.date)},${height - padding.bottom} L${xPos(first.date)},${height - padding.bottom} Z`;
  });

  // Compute x-axis ticks
  let xTicks = $derived(() => {
    if (data.length < 2) return [];
    const first = new Date(data[0].date + 'T00:00:00').getTime();
    const last = new Date(data[data.length - 1].date + 'T00:00:00').getTime();
    const span = last - first;
    const count = Math.min(5, data.length);
    const step = span / (count - 1);
    return Array.from({ length: count }, (_, i) => {
      const ts = first + step * i;
      const d = new Date(ts);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        x: xPos(d.toISOString().split('T')[0]),
      };
    });
  });

  // Last value label
  let lastPoint = $derived(data.length > 0 ? data[data.length - 1] : null);

  $effect(() => {
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      width = entries[0].contentRect.width || 600;
    });
    ro.observe(container);
    return () => ro.disconnect();
  });
</script>

<div bind:this={container} class="chart-container">
  {#if data.length < 2}
    <div class="empty-chart">
      <span>Not enough data for trend</span>
    </div>
  {:else}
    <svg {width} {height} style="width:100%; height:{height}px; overflow:visible;">
      <defs>
        <linearGradient id="area-gradient-{accountId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--gold)" stop-opacity="0.25" />
          <stop offset="100%" stop-color="var(--gold)" stop-opacity="0.02" />
        </linearGradient>
      </defs>

      <!-- Area fill -->
      <path d={areaD()} fill="url(#area-gradient-{accountId})" />

      <!-- Line -->
      <path d={pathD()} fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

      <!-- X axis ticks -->
      {#each xTicks() as tick}
        <line x1={tick.x} y1={height - padding.bottom} x2={tick.x} y2={height - padding.bottom + 4} stroke="var(--text3)" stroke-width="1" />
        <text x={tick.x} y={height - 6} text-anchor="middle" style="font-size:9px; fill:var(--text3); font-family:monospace;">
          {tick.label}
        </text>
      {/each}

      <!-- Last point dot + label -->
      {#if lastPoint}
        {@const x = xPos(lastPoint.date)}
        {@const y = yPos(lastPoint.balance)}
        <circle cx={x} cy={y} r="3.5" fill="var(--gold)" />
        <text {x} y={y - 8} text-anchor="middle"
          style="font-size:9px; fill:var(--gold); font-family:monospace; font-weight:600;">
          {lastPoint.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </text>
      {/if}
    </svg>
  {/if}
</div>

<style>
  .chart-container {
    width: 100%;
    overflow: hidden;
  }
  .empty-chart {
    height: 160px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--text3);
    font-family: monospace;
    letter-spacing: 0.05em;
  }
</style>
