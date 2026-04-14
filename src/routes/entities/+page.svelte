<script>
  let { data } = $props();
  let entities = $derived(data.entities || []);
  import { CURRENCIES, ENTITY_TYPES } from '$lib/constants';

  let showForm = $state(false);
  let name = $state('');
  let type = $state('headquarters');
  let country = $state('');
  let currency = $state('EUR');
  let taxId = $state('');
  let submitting = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    submitting = true;
    const res = await fetch('/api/entities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, type, country, currency, taxId }),
    });
    if (res.ok) {
      const entity = await res.json();
      entities = [...entities, entity];
      name = ''; type = 'headquarters'; country = ''; currency = 'EUR'; taxId = '';
      showForm = false;
      window.__toast?.('Entity created successfully');
    } else {
      const err = await res.json();
      window.__toast?.(err.error || 'Failed to create entity', 'error');
    }
    submitting = false;
  }
</script>

<svelte:head>
  <title>Entities — Treasury</title>
</svelte:head>

<div class="max-w-5xl mx-auto page-desktop">
  <div class="flex items-center justify-between mb-5">
    <div>
      <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Corporate Structure</div>
      <h1 class="text-xl font-bold" style="color: var(--text);">Entities</h1>
    </div>
    <button onclick={() => showForm = !showForm}
      class="px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
      style="background: var(--gold); color: #fff;">
      {showForm ? 'Cancel' : '+ New Entity'}
    </button>
  </div>

  {#if showForm}
    <div class="stat-card mb-5">
      <form onsubmit={handleSubmit} class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div>
          <label class="label" for="ename">Name *</label>
          <input id="ename" type="text" bind:value={name} placeholder="Acme Corp" required class="input" />
        </div>
        <div>
          <label class="label" for="etype">Type</label>
          <select id="etype" bind:value={type} class="input">
            {#each Object.entries(ENTITY_TYPES) as [key, cfg]}
              <option value={key}>{cfg.icon} {cfg.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="label" for="ecur">Currency</label>
          <select id="ecur" bind:value={currency} class="input">
            {#each CURRENCIES as cur}
              <option value={cur}>{cur}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="label" for="ecountry">Country</label>
          <input id="ecountry" type="text" bind:value={country} placeholder="ES" maxlength="2" class="input" />
        </div>
        <div>
          <label class="label" for="etax">Tax ID</label>
          <input id="etax" type="text" bind:value={taxId} placeholder="B12345678" class="input" />
        </div>
        <div class="flex items-end">
          <button type="submit" disabled={submitting || !name.trim()}
            class="w-full py-2.5 rounded-lg text-xs font-semibold btn-gold disabled:opacity-40">
            {submitting ? 'Creating...' : 'Create Entity'}
          </button>
        </div>
      </form>
    </div>
  {/if}

  {#if entities.length > 0}
    <div class="stat-card hidden md:block" style="padding: 0; overflow: hidden;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Entity</th>
            <th>Type</th>
            <th>Country</th>
            <th>Currency</th>
            <th>Tax ID</th>
          </tr>
        </thead>
        <tbody>
          {#each entities as ent}
            <tr>
              <td><a href="/entities/{ent.id}" class="no-underline" style="color: var(--text); font-weight: 500;">{ent.name}</a></td>
              <td>
                <!-- cfg inline -->
                <span class="badge {ENTITY_TYPES[ent.type]?.badge || 'badge-gold'}">{ENTITY_TYPES[ent.type]?.icon} {ENTITY_TYPES[ent.type]?.label || ent.type}</span>
              </td>
              <td style="color: var(--text3);">{ent.country || '—'}</td>
              <td class="mono" style="color: var(--text3);">{ent.currency}</td>
              <td class="mono" style="color: var(--text3);">{ent.taxId || '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="md:hidden space-y-2">
      {#each entities as ent}
        <!-- cfg inline -->
        <a href="/entities/{ent.id}" class="account-row block no-underline">
          <div class="text-base">{ENTITY_TYPES[ent.type]?.icon || '🏢'}</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold truncate" style="color: var(--text);">{ent.name}</div>
            <div class="text-[10px]" style="color: var(--text3);">{ENTITY_TYPES[ent.type]?.label || ent.type} · {ent.currency}{#if ent.country} · {ent.country}{/if}</div>
          </div>
          <span class="text-xs" style="color: var(--gold);">→</span>
        </a>
      {/each}
    </div>
  {:else}
    <div class="stat-card text-center py-12">
      <div class="text-3xl mb-3">🏢</div>
      <div style="color: var(--text3); font-size: 12px;">No entities yet. Create one to get started.</div>
    </div>
  {/if}
</div>
