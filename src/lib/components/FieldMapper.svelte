<script lang="ts">
  // apiFields: string[] — field names from the detected API response
  // internalFields: { key: string, label: string, required?: boolean }[] — our internal fields
  // connections: Record<string, string> — { apiField: internalKey } (bindable)
  let { apiFields = [], internalFields = [], connections = $bindable({}) } = $props();

  let selectedLeft = $state<string | null>(null);

  // Reverse lookup: internalKey → apiField
  let rightMap = $derived(() => {
    const m: Record<string, string> = {};
    for (const [l, r] of Object.entries(connections)) m[r] = l;
    return m;
  });

  function handleLeftClick(field: string) {
    selectedLeft = selectedLeft === field ? null : field;
  }

  function handleRightClick(internalKey: string) {
    if (!selectedLeft) {
      // If already connected, disconnect
      const existing = rightMap()[internalKey];
      if (existing) {
        const next = { ...connections };
        delete next[existing];
        connections = next;
      }
      return;
    }
    // Remove any existing connection from this left field
    const next = { ...connections };
    delete next[selectedLeft];
    // Remove any existing connection TO this right field
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

<div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
  <div style="font-size: 9px; color: var(--text3);">
    {#if selectedLeft}
      <span style="color: var(--gold);">● {selectedLeft}</span> selected — click a right field to connect
    {:else}
      Click a left field, then a right field to connect
    {/if}
  </div>
  {#if Object.keys(connections).length > 0}
    <button onclick={clearAll} style="font-size: 8px; color: var(--red); background: none; border: none; cursor: pointer; text-decoration: underline;">Clear all</button>
  {/if}
</div>

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
  <!-- Left: API Fields -->
  <div>
    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--text3); margin-bottom: 6px; padding: 0 8px;">
      Your API
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      {#each apiFields as field}
        {@const conn = connections[field]}
        <button
          onclick={() => handleLeftClick(field)}
          style="display: flex; align-items: center; gap: 6px; width: 100%; padding: 6px 8px; border-radius: 5px; border: 1px solid {selectedLeft === field ? 'var(--gold)' : conn ? 'rgba(201,168,76,0.25)' : 'var(--border)'}; background: {selectedLeft === field ? 'rgba(201,168,76,0.1)' : conn ? 'rgba(201,168,76,0.04)' : 'transparent'}; cursor: pointer; text-align: left; transition: all 0.12s;"
        >
          <div style="width: 6px; height: 6px; border-radius: 50%; background: {conn ? 'var(--gold)' : selectedLeft === field ? 'var(--gold)' : 'var(--text3)'}; opacity: {conn || selectedLeft === field ? '1' : '0.3'}; flex-shrink: 0;"></div>
          <span style="font-size: 10px; color: var(--text); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{field}</span>
          {#if conn}
            <span style="font-size: 8px; color: var(--gold); white-space: nowrap;">→</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Right: Internal Fields -->
  <div>
    <div style="font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--text3); margin-bottom: 6px; padding: 0 8px;">
      Treasury
    </div>
    <div style="display: flex; flex-direction: column; gap: 2px;">
      {#each internalFields as intField}
        {@const owner = rightMap()[intField.key]}
        <button
          onclick={() => handleRightClick(intField.key)}
          style="display: flex; align-items: center; gap: 6px; width: 100%; padding: 6px 8px; border-radius: 5px; border: 1px solid {owner ? 'rgba(201,168,76,0.25)' : intField.required ? 'rgba(255,77,106,0.15)' : 'var(--border)'}; background: {owner ? 'rgba(201,168,76,0.04)' : 'transparent'}; cursor: pointer; text-align: left; transition: all 0.12s;"
        >
          {#if owner}
            <span style="font-size: 8px; color: var(--gold); white-space: nowrap;">←</span>
          {/if}
          <span style="font-size: 10px; color: var(--text); font-weight: 500; flex: 1;">{intField.label || intField.key}</span>
          {#if intField.required && !owner}
            <span style="font-size: 7px; color: var(--red); opacity: 0.7;">required</span>
          {/if}
          {#if owner}
            <span style="font-size: 7px; color: var(--text3); max-width: 100px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">← {owner}</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>

<!-- Connected summary -->
{#if Object.keys(connections).length > 0}
  <div style="margin-top: 10px; padding: 8px; background: var(--bg-surface); border-radius: 6px; border: 1px solid var(--border);">
    <div style="font-size: 8px; color: var(--text3); margin-bottom: 4px;">MAPPED ({Object.keys(connections).length})</div>
    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
      {#each Object.entries(connections) as [left, right]}
        <span style="font-size: 9px; color: var(--gold); background: rgba(201,168,76,0.1); padding: 2px 6px; border-radius: 3px;">
          {left} → {right}
        </span>
      {/each}
    </div>
  </div>
{/if}
