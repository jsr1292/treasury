<script lang="ts">
  interface TrendPoint { date: string; balance: number; currency: string; }
  let { balances, accountId }: { balances: TrendPoint[]; accountId: string } = $props();

  let data = $derived(balances?.filter((b: TrendPoint) => b.date) ?? []);

  // Single reactive y-scale — fully derived from data, no stale closures
  let yScale = $derived.by(() => {
    if (data.length < 2) return { min: 0, max: 1, range: 1 };
    const vals = data.map(d => d.balance);
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    const rng = mx - mn || 1;
    // 95th percentile for display max (prevents one spike crushing the chart)
    const sorted = [...vals].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? mx;
    const displayMax = Math.max(p95, mx > 0 ? Math.max(mx * 0.1, 1) : 1);
    const displayRange = Math.max(displayMax - mn, 1);
    return { min: mn, max: displayMax, range: displayRange };
  });

  let width = $state(600);
  let height = 160;
  let padding = { top: 12, right: 12, bottom: 28, left: 12 };

  let container: HTMLElement;

  function xPos(dateStr: string) {
    if (data.length < 2) return padding.left;
    const d = new Date(dateStr + 'T00:00:00').getTime();
    const first = new Date(data[0].date + 'T00:00:00').getTime();
    const last = new Date(data[data.length - 1].date + 'T00:00:00').getTime();
    const span = last - first || 1;
    const usable = width - padding.left - padding.right;
    const pos = padding.left + ((d - first) / span) * usable;
    return Math.max(padding.left, Math.min(width - padding.right, pos));
  }

  // yScale used directly — reactive, no stale closures
  function yPos(val: number) {
    return padding.top + ((yScale.max - val) / yScale.range) * (height - padding.top - padding.bottom);
  }

  let pathD = $derived.by(() => {
    if (data.length < 2) return '';
    return data.map((d, i) => {
      const x = xPos(d.date);
      const y = yPos(d.balance);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    }).join(' ');
  });

  let areaD = $derived.by(() => {
    if (data.length < 2) return '';
    const line = pathD;
    const last = data[data.length - 1];
    const first = data[0];
    return `${line} L${xPos(last.date)},${height - padding.bottom} L${xPos(first.date)},${height - padding.bottom} Z`;
  });

  let yGridLines = $derived.by(() => {
    if (data.length < 2) return [];
    const lines = 3;
    return Array.from({ length: lines }, (_, i) => {
      const val = yScale.min + (yScale.range / (lines - 1)) * i;
      const y = padding.top + (1 - i / (lines - 1)) * (height - padding.top - padding.bottom);
      return { y: Math.round(y), val };
    });
  });

  let xTicks = $derived.by(() => {
    if (data.length < 2) return [];
    const first = new Date(data[0].date + 'T00:00:00').getTime();
    const last = new Date(data[data.length - 1].date + 'T00:00:00').getTime();
    const span = last - first;
    const count = Math.min(5, data.length);
    const step = span / (count - 1);
    const ticks = Array.from({ length: count }, (_, i) => {
      const ts = first + step * i;
      const d = new Date(ts);
      return {
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        x: xPos(d.toISOString().split('T')[0]),
      };
    });
    // Remove duplicate positions (can happen with very short spans)
    return ticks.filter((t, i) => i === 0 || Math.abs(t.x - ticks[i - 1].x) > 1);
  });

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

      <!-- Horizontal grid lines -->
      {#each yGridLines as gl}
        <line x1={padding.left} y1={gl.y} x2={width - padding.right} y2={gl.y} stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3" />
        <text x={width - padding.right - 2} y={gl.y + 3} text-anchor="end" style="font-size:8px; fill:var(--text3); font-family:monospace;">
          {gl.val >= 1000 ? (gl.val / 1000).toFixed(gl.val >= 10000 ? 0 : 1) + 'k' : gl.val.toFixed(0)}
        </text>
      {/each}

      <!-- Area fill -->
      <path d={areaD} fill="url(#area-gradient-{accountId})" />

      <!-- Line -->
      <path d={pathD} fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />

      <!-- X axis ticks -->
      {#each xTicks as tick, i}
        {@const anchor = i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
        <line x1={tick.x} y1={height - padding.bottom} x2={tick.x} y2={height - padding.bottom + 4} stroke="var(--text3)" stroke-width="1" />
        <text x={tick.x} y={height - 6} text-anchor={anchor}
          style="font-size:9px; fill:var(--text3); font-family:monospace; dominant-baseline: hanging;">
          {tick.label}
        </text>
      {/each}

      <!-- Last point dot + label -->
      {#if lastPoint}
        {@const x = xPos(lastPoint.date)}
        {@const y = yPos(lastPoint.balance)}
        {@const labelX = Math.max(padding.left + 4, x - 20)}
        <circle cx={x} cy={y} r="3.5" fill="var(--gold)" />
        <text x={labelX} y={y - 8} text-anchor="start"
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
