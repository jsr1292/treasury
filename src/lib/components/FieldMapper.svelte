<script lang="ts">
  // apiFields: string[] — field names from the detected API response
  // internalFields: { key: string, label: string, icon?: string, hint?: string, required?: boolean }[]
  // connections: Record<string, string> — { apiField: internalKey } (bindable)
  // sampleValues?: Record<string, string> — sample data for preview
  let { apiFields = [], internalFields = [], connections = $bindable({}), sampleValues = {} } = $props();

  let selectedLeft = $state<string | null>(null);

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

  let rightMap = $derived(() => {
    const m: Record<string, string> = {};
    for (const [l, r] of Object.entries(connections)) m[r] = l;
    return m;
  });

  let connectedCount = $derived(() => Object.keys(connections).length);
  let requiredFields = $derived(() => internalFields.filter(f => f.required));
  let requiredMapped = $derived(() => requiredFields.filter(f => rightMap()[f.key]).length);
  let allRequiredMapped = $derived(() => requiredMapped >= requiredFields.length);

  // Track which required field we're prompting for
  let nextRequired = $derived(() => {
    return requiredFields.find(f => !rightMap()[f.key]);
  });

  function handleLeftClick(field: string) {
    if (connections[field]) {
      // Already connected — disconnect
      const next = { ...connections };
      delete next[field];
      connections = next;
      return;
    }
    selectedLeft = selectedLeft === field ? null : field;
  }

  function handleRightClick(internalKey: string) {
    if (!selectedLeft) return;
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

  function autoConnect() {
    // Smart auto-match by name similarity
    const next: Record<string, string> = {};
    const usedRight = new Set<string>();
    const usedLeft = new Set<string>();

    // First pass: exact matches (case-insensitive)
    for (const apiField of apiFields) {
      const apiLower = apiField.toLowerCase().replace(/[_\s-]/g, '');
      for (const intField of internalFields) {
        if (usedRight.has(intField.key)) continue;
        const intLower = intField.key.toLowerCase().replace(/[_\s-]/g, '');
        if (apiLower === intLower || apiLower === intField.label?.toLowerCase().replace(/[_\s-]/g, '')) {
          next[apiField] = intField.key;
          usedRight.add(intField.key);
          usedLeft.add(apiField);
          break;
        }
      }
    }

    // Second pass: contains match
    for (const apiField of apiFields) {
      if (usedLeft.has(apiField)) continue;
      const apiLower = apiField.toLowerCase();
      for (const intField of internalFields) {
        if (usedRight.has(intField.key)) continue;
        const intLower = intField.key.toLowerCase();
        const labelLower = (intField.label || '').toLowerCase();
        if (apiLower.includes(intLower) || intLower.includes(apiLower) ||
            apiLower.includes(labelLower) || labelLower.includes(apiLower)) {
          next[apiField] = intField.key;
          usedRight.add(intField.key);
          usedLeft.add(apiField);
          break;
        }
      }
    }

    connections = next;
    selectedLeft = null;
  }
</script>

<!-- Header -->
<div style="margin-bottom: 14px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      {#if allRequiredMapped && connectedCount > 0}
        <span style="font-size: 11px;">✅</span>
        <span style="font-size: 10px; color: var(--green); font-weight: 500;">All set! {connectedCount} fields connected</span>
      {:else if selectedLeft}
        <span style="font-size: 11px;">👆</span>
        <span style="font-size: 10px; color: var(--gold); font-weight: 500;">
          Now click the matching field on the right →
        </span>
      {:else if nextRequired}
        <span style="font-size: 11px;">🔗</span>
        <span style="font-size: 10px; color: var(--text3);">
          Click <strong>"{nextRequired.label}"</strong> on the left to connect it
        </span>
      {:else}
        <span style="font-size: 10px; color: var(--text3);">
          Click a field on the left, then click its match on the right
        </span>
      {/if}
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <button onclick={autoConnect} style="font-size: 8px; color: var(--blue); background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 4px; padding: 2px 8px; cursor: pointer;">✨ Auto-match</button>
      {#if connectedCount > 0}
        <button onclick={clearAll} style="font-size: 8px; color: var(--red); background: none; border: none; cursor: pointer; opacity: 0.6;">Reset</button>
      {/if}
    </div>
  </div>

  <!-- Progress -->
  <div style="display: flex; align-items: center; gap: 8px;">
    <div style="flex: 1; height: 4px; background: var(--border); border-radius: 3px; overflow: hidden;">
      <div style="height: 100%; width: {allRequiredMapped ? 100 : (requiredFields.length > 0 ? requiredMapped / requiredFields.length * 100 : 0)}%; background: {allRequiredMapped ? 'var(--green)' : 'var(--gold)'}; border-radius: 3px; transition: width 0.4s ease, background 0.4s;"></div>
    </div>
    <span style="font-size: 9px; color: {allRequiredMapped ? 'var(--green)' : 'var(--text3)'}; white-space: nowrap;">
      {requiredMapped}/{requiredFields.length}
    </span>
  </div>
</div>

<!-- Two columns -->
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
  <!-- Left: Your API -->
  <div>
    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--text3); margin-bottom: 8px; padding: 0 4px;">
      ← From your API
    </div>
    <div style="display: flex; flex-direction: column; gap: 3px;">
      {#each apiFields as field}
        {@const conn = connections[field]}
        {@const color = connectionColors()[field]}
        {@const sample = sampleValues[field]}
        <button
          onclick={() => handleLeftClick(field)}
          style="position: relative; display: flex; flex-direction: column; width: 100%; padding: 7px 10px 7px 14px; border-radius: 8px; border: 1.5px solid {selectedLeft === field ? 'var(--gold)' : conn ? color + '50' : 'var(--border)'}; background: {selectedLeft === field ? 'rgba(201,168,76,0.08)' : conn ? color + '0d' : 'var(--bg-surface)'}; cursor: pointer; text-align: left; transition: all 0.2s;"
        >
          <!-- Left color dot -->
          <div style="position: absolute; left: 4px; top: 50%; transform: translateY(-50%); width: 5px; height: 5px; border-radius: 50%; background: {conn ? color : selectedLeft === field ? 'var(--gold)' : 'var(--text3)'}; opacity: {conn || selectedLeft === field ? '1' : '0.2'}; {selectedLeft === field ? 'animation: pulse 1.2s infinite;' : ''}"></div>
          <span style="font-size: 10px; color: var(--text); font-weight: {conn ? '500' : '400'};">{field}</span>
          {#if sample}
            <span style="font-size: 8px; color: var(--text3); margin-top: 2px; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{sample}</span>
          {/if}
          {#if conn}
            <span style="font-size: 7px; color: {color}; margin-top: 2px; font-weight: 500;">→ {internalFields.find(f => f.key === conn)?.label || conn} ✕</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Right: Treasury -->
  <div>
    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--text3); margin-bottom: 8px; padding: 0 4px;">
      To Treasury App →
    </div>
    <div style="display: flex; flex-direction: column; gap: 3px;">
      {#each internalFields as intField}
        {@const owner = rightMap()[intField.key]}
        {@const color = connectionColors()[intField.key]}
        {@const canClick = selectedLeft || owner}
        {@const isNext = nextRequired?.key === intField.key && !owner}
        <button
          onclick={() => handleRightClick(intField.key)}
          disabled={!canClick}
          style="position: relative; display: flex; align-items: center; width: 100%; padding: 7px 10px 7px 14px; border-radius: 8px; border: 1.5px solid {owner ? color + '50' : isNext ? 'var(--gold)' : intField.required && !owner ? 'rgba(255,77,106,0.1)' : 'var(--border)'}; background: {owner ? color + '0d' : isNext && selectedLeft ? 'rgba(201,168,76,0.06)' : 'var(--bg-surface)'}; cursor: {canClick ? 'pointer' : 'default'}; text-align: left; transition: all 0.2s; opacity: {canClick ? '1' : '0.4'};"
        >
          <!-- Right color dot -->
          <div style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); width: 5px; height: 5px; border-radius: 50%; background: {owner ? color : isNext ? 'var(--gold)' : 'transparent'};"></div>
          <div style="display: flex; align-items: center; gap: 5px; flex: 1;">
            {#if intField.icon}
              <span style="font-size: 12px;">{intField.icon}</span>
            {/if}
            <div>
              <span style="font-size: 10px; color: var(--text); font-weight: {owner ? '600' : '400'};">{intField.label || intField.key}</span>
              {#if intField.hint && !owner}
                <div style="font-size: 7px; color: var(--text3); margin-top: 1px;">{intField.hint}</div>
              {/if}
              {#if owner}
                <div style="font-size: 7px; color: {color}; margin-top: 1px;">← {owner}</div>
              {/if}
            </div>
          </div>
          {#if intField.required && !owner}
            <span style="font-size: 8px; color: var(--red); opacity: 0.6; font-weight: 500;">*</span>
          {:else if owner}
            <span style="font-size: 10px; color: {color};">✓</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>

<!-- Summary pills -->
{#if connectedCount > 0}
  <div style="margin-top: 14px; display: flex; flex-wrap: wrap; gap: 4px;">
    {#each Object.entries(connections) as [left, right], i}
      {@const color = COLORS[i % COLORS.length]}
      <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 9px; padding: 3px 8px 3px 10px; border-radius: 12px; background: {color}12; border: 1px solid {color}30;">
        <span style="color: {color}; font-weight: 500; max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{left}</span>
        <span style="color: {color};">→</span>
        <span style="color: var(--text);">{internalFields.find(f => f.key === right)?.label || right}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
</style>
