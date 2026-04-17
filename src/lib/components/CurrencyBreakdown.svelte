<script lang="ts">
  let { totalsByCurrency }: { totalsByCurrency: Record<string, number> } = $props();

  let entries = $derived(
    Object.entries(totalsByCurrency)
      .filter(([, v]) => (v as number) > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
  );

  let total = $derived(entries.reduce((s, [, v]) => s + (v as number), 0));

  const CURRENCY_COLORS: Record<string, string> = {
    EUR: '#c9a84c', USD: '#60a5fa', GBP: '#a855f7',
    CHF: '#f97316', JPY: '#f43f5e', CNY: '#22c55e',
    default: '#8096b4',
  };

  function colorOf(currency: string): string {
    return CURRENCY_COLORS[currency] || CURRENCY_COLORS.default;
  }

  function pct(value: number): number {
    return total > 0 ? (value / total) * 100 : 0;
  }

  // Donut math
  const CX = 50, CY = 50, R = 40, CIRC = 2 * Math.PI * R;

  function dashArray(pctVal: number) {
    const dash = (pctVal / 100) * CIRC;
    return `${dash} ${CIRC - dash}`;
  }

  function dashOffset(currency: string, idx: number) {
    const offset = entries.slice(0, idx)
      .reduce((s, [, v]) => s - (pct(v as number) / 100) * CIRC, CIRC / 4);
    return -offset;
  }
</script>

{#if entries.length > 0}
  <div class="breakdown">
    <!-- Bar chart -->
    <div class="bar-chart">
      {#each entries as [currency, value]}
        {@const pct_val = pct(value as number)}
        {@const color = colorOf(currency)}
        <div class="bar-row">
          <span class="bar-label" style="color: {color};">{currency}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width:{pct_val}%; background:{color};"></div>
          </div>
          <span class="bar-value" style="color:{color};">
            {(value as number).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      {/each}
    </div>

    <!-- Donut chart (desktop only) -->
    <div class="donut-container hidden md:flex">
      <svg viewBox="0 0 100 100" class="donut">
        {#each entries as [currency, value], i}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke={colorOf(currency)}
            stroke-width="8"
            stroke-dasharray={dashArray(pct(value as number))}
            stroke-dashoffset={dashOffset(currency, i)}
            style="transition: stroke-dasharray 0.5s ease;"
          />
        {/each}
        <!-- Center total -->
        <text x={CX} y={CY - 4} text-anchor="middle" dominant-baseline="middle"
          style="font-size:9px; fill:var(--text3); font-family:monospace;">TOTAL</text>
        <text x={CX} y={CY + 10} text-anchor="middle" dominant-baseline="middle"
          style="font-size:10px; fill:var(--gold); font-family:monospace; font-weight:700;">
          {total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </text>
      </svg>
    </div>
  </div>
{:else}
  <div class="empty">No currency data</div>
{/if}

<style>
  .breakdown { display: flex; gap: 20px; align-items: center; }
  .bar-chart { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .bar-row { display: flex; align-items: center; gap: 8px; font-family: monospace; font-size: 11px; }
  .bar-label { width: 36px; flex-shrink: 0; font-weight: 600; font-size: 10px; text-align: right; }
  .bar-track { flex: 1; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; min-width: 60px; }
  .bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
  .bar-value { width: 110px; text-align: right; font-size: 10px; flex-shrink: 0; font-weight: 600; }
  .donut-container { flex-shrink: 0; }
  .donut { width: 90px; height: 90px; transform: rotate(-90deg); }
  .empty { font-size: 12px; color: var(--text3); text-align: center; padding: 20px; font-family: monospace; }
</style>
