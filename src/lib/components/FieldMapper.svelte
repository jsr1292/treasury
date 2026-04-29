<script lang="ts">
  // apiFields: string[] — field names from the detected API response
  // internalFields: { key: string, label: string, required?: boolean }[] — our internal fields
  // connections: Record<string, string> — { apiField: internalKey } (bindable)
  // sampleValues?: Record<string, string> — sample data for preview
  let { apiFields = [], internalFields = [], connections = $bindable({}), sampleValues = {} } = $props();

  let selectedLeft = $state<string | null>(null);
  let hoveredRight = $state<string | null>(null);

  // Connection colors — each connection gets a unique color
  const COLORS = [
    '#c9a84c', '#3b82f6', '#00e5a0', '#ff4d6a', '#a78bfa',
    '#f59e0b', '#06b6d4', '#ec4899', '#84cc16', '#f97316',
  ];

  let connectionColors = $derived(() => {
    const map: Record<string, string> = {};
    let i = 0;
    for (const left of Object.keys(connections)) {
      map[left] = COLORS[i % COLORS.length];
      map[connections[left]] = COLORS[i % COLORS.length];
      i++;
    }
    return map;
  });

  // Reverse lookup
  let rightMap = $derived(() => {
    const m: Record<string, string> = {};
    for (const [l, r] of Object.entries(connections)) m[r] = l;
    return m;
  });

  let connectedCount = $derived(() => Object.keys(connections).length);
  let requiredCount = $derived(() => internalFields.filter(f => f.required).length);
  let requiredMapped = $derived(() => internalFields.filter(f => f.required && rightMap()[f.key]).length);

  function handleLeftClick(field: string) {
    selectedLeft = selectedLeft === field ? null : field;
  }

  function handleRightClick(internalKey: string) {
    if (!selectedLeft) {
      // Disconnect existing
      const existing = rightMap()[internalKey];
      if (existing) {
        const next = { ...connections };
        delete next[existing];
        connections = next;
      }
      return;
    }
    const next = { ...connections };
    delete next[selectedLeft];
    for (const [l, r] of Object.entries(next)) {
      if (r === internalKey) delete next[l];
    }
    next[selectedLeft] = internalKey;
    connections = next;
    selectedLeft = null;
  }

  function clearAll() {
    connections = {};
    selectedLeft = null;
  }
</script>

<!-- Progress bar -->
<div style="margin-bottom: 12px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
    <div style="font-size: 9px; color: var(--text3);">
      {#if selectedLeft}
        <span style="display: inline-flex; align-items: center; gap: 4px;">
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--gold); animation: pulse 1.5s infinite;"></span>
          <span style="color: var(--gold); font-weight: 500;">{selectedLeft}</span> selected — click a field on the right →
        </span>
      {:else}
        Click left field → click right field to connect
      {/if}
    </div>
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 9px; color: {requiredMapped >= requiredCount ? 'var(--green)' : 'var(--text3)'};">
        {requiredMapped}/{requiredCount} required
      </span>
      {#if connectedCount > 0}
        <button onclick={clearAll} style="font-size: 8px; color: var(--red); background: none; border: none; cursor: pointer; text-decoration: underline; opacity: 0.7;">Reset</button>
      {/if}
    </div>
  </div>
  <div style="height: 3px; background: var(--border); border-radius: 2px; overflow: hidden;">
    <div style="height: 100%; width: {requiredCount > 0 ? (requiredMapped / requiredCount * 100) : 0}%; background: {requiredMapped >= requiredCount ? 'var(--green)' : 'var(--gold)'}; border-radius: 2px; transition: width 0.3s;"></div>
  </div>
</div>

<!-- Mapper grid -->
<div style="display: grid; grid-template-columns: 1fr 40px 1fr; gap: 0; align-items: start;">
  <!-- Left: API Fields -->
  <div>
    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--text3); margin-bottom: 6px; padding: 0 8px;">
      Your API
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      {#each apiFields as field, i}
        {@const conn = connections[field]}
        {@const color = connectionColors()[field]}
        {@const sample = sampleValues[field]}
        <button
          onclick={() => handleLeftClick(field)}
          style="display: flex; align-items: center; gap: 0; width: 100%; padding: 0; border-radius: 6px; border: none; background: transparent; cursor: pointer; text-align: left;"
        >
          <!-- Color indicator bar -->
          <div style="width: 3px; height: 32px; border-radius: 2px; background: {conn ? color : selectedLeft === field ? 'var(--gold)' : 'transparent'}; margin-right: 6px; transition: background 0.2s; flex-shrink: 0;"></div>
          <div style="flex: 1; padding: 5px 8px; border-radius: 5px; border: 1px solid {selectedLeft === field ? 'var(--gold)' : conn ? color + '40' : 'var(--border)'}; background: {selectedLeft === field ? 'rgba(201,168,76,0.08)' : conn ? color + '0a' : 'var(--bg-surface)'}; transition: all 0.15s; min-height: 32px; display: flex; flex-direction: column; justify-content: center;">
            <span style="font-size: 10px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{field}</span>
            {#if sample}
              <span style="font-size: 8px; color: var(--text3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px;">{sample}</span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Middle: Connection arrows -->
  <div style="display: flex; flex-direction: column; align-items: center; padding-top: 22px; gap: 2px;">
    {#each apiFields as field}
      {@const conn = connections[field]}
      {@const color = connectionColors()[field]}
      <div style="height: 32px; display: flex; align-items: center; justify-content: center;">
        {#if conn}
          <div style="width: 20px; height: 2px; background: {color}; border-radius: 1px;"></div>
        {:else if selectedLeft === field}
          <div style="width: 20px; height: 2px; background: var(--gold); border-radius: 1px; opacity: 0.5; animation: pulse 1.5s infinite;"></div>
        {:else}
          <div style="width: 20px; height: 2px; background: var(--border); border-radius: 1px; opacity: 0.3;"></div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Right: Internal Fields -->
  <div>
    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--text3); margin-bottom: 6px; padding: 0 8px;">
      Treasury App
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      {#each internalFields as intField}
        {@const owner = rightMap()[intField.key]}
        {@const color = connectionColors()[intField.key]}
        {@const canClick = selectedLeft || owner}
        <button
          onclick={() => handleRightClick(intField.key)}
          onmouseenter={() => hoveredRight = intField.key}
          onmouseleave={() => hoveredRight = null}
          style="display: flex; align-items: center; gap: 0; width: 100%; padding: 0; border-radius: 6px; border: none; background: transparent; cursor: {canClick ? 'pointer' : 'default'}; text-align: left;"
        >
          <div style="flex: 1; padding: 5px 8px; border-radius: 5px; border: 1px solid {owner ? color + '40' : intField.required && !owner ? 'rgba(255,77,106,0.12)' : 'var(--border)'}; background: {owner ? color + '0a' : selectedLeft ? 'rgba(201,168,76,0.03)' : 'transparent'}; transition: all 0.15s; min-height: 32px; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 10px; color: {owner ? 'var(--text)' : canClick ? 'var(--text)' : 'var(--text3)'}; font-weight: {owner ? '500' : '400'};">{intField.label || intField.key}</span>
            {#if intField.required && !owner}
              <span style="font-size: 7px; color: var(--red); opacity: 0.5; margin-left: 4px;">●</span>
            {/if}
          </div>
          <!-- Color indicator bar -->
          <div style="width: 3px; height: 32px; border-radius: 2px; background: {owner ? color : 'transparent'}; margin-left: 6px; transition: background 0.2s; flex-shrink: 0;"></div>
        </button>
      {/each}
    </div>
  </div>
</div>

<!-- Connected summary pills -->
{#if connectedCount > 0}
  <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 4px;">
    {#each Object.entries(connections) as [left, right], i}
      {@const color = COLORS[i % COLORS.length]}
      <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 9px; padding: 3px 8px; border-radius: 10px; background: {color}15; border: 1px solid {color}30;">
        <span style="color: {color}; font-weight: 500; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{left}</span>
        <span style="color: {color};">→</span>
        <span style="color: var(--text); font-weight: 500;">{internalFields.find(f => f.key === right)?.label || right}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
</style>
