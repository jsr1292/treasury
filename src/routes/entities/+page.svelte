<script>
  let { data } = $props();
  let entities = $derived(data.entities || []);

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
    }
    submitting = false;
  }
</script>

<svelte:head>
  <title>Entities — Treasury</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-6">
  <div class="flex items-center justify-between mb-6">
    <div>
      <div class="text-[10px] uppercase tracking-[0.12em] mb-1" style="color: var(--text3);">Organizational structure</div>
      <h1 class="text-2xl font-bold" style="color: var(--gold);">🏢 Entities</h1>
    </div>
    <button onclick={() => showForm = !showForm}
      class="px-4 py-2 rounded-lg text-xs font-bold"
      style="background: {showForm ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, var(--gold), #b8943f)'}; color: {showForm ? 'var(--text3)' : 'var(--bg-dark)'};">
      {showForm ? 'Cancel' : '+ Add Entity'}
    </button>
  </div>

  <!-- Add entity form -->
  {#if showForm}
    <div class="glass rounded-2xl p-5 mb-6" style="border: 1px solid var(--glass-border);">
      <div class="text-xs font-semibold mb-4" style="color: var(--gold); letter-spacing: 0.1em;">NEW ENTITY</div>
      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label class="label" for="ename">Name</label>
          <input id="ename" type="text" bind:value={name} placeholder="Grupo XYZ S.A." required class="input" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="etype">Type</label>
            <select id="etype" bind:value={type} class="input">
              <option value="headquarters">Headquarters</option>
              <option value="branch">Branch</option>
              <option value="subsidiary">Subsidiary</option>
            </select>
          </div>
          <div>
            <label class="label" for="ecur">Currency</label>
            <input id="ecur" type="text" bind:value={currency} placeholder="EUR" class="input" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="ecountry">Country</label>
            <input id="ecountry" type="text" bind:value={country} placeholder="ES" class="input" />
          </div>
          <div>
            <label class="label" for="etax">Tax ID</label>
            <input id="etax" type="text" bind:value={taxId} placeholder="B12345678" class="input" />
          </div>
        </div>
        <button type="submit" disabled={submitting || !name.trim()}
          class="w-full py-3 rounded-lg text-xs font-bold btn-gold disabled:opacity-40">
          {submitting ? 'Creating...' : 'Create Entity'}
        </button>
      </form>
    </div>
  {/if}

  <!-- Entity list -->
  {#if entities.length > 0}
    <div class="space-y-2">
      {#each entities as entity}
        <div class="account-row">
          <div class="text-base">{entity.type === 'headquarters' ? '🏢' : entity.type === 'branch' ? '📍' : '🏗️'}</div>
          <div class="flex-1">
            <div class="text-sm font-semibold" style="color: var(--text);">{entity.name}</div>
            <div class="text-[10px]" style="color: var(--text3);">
              <span style="color: {entity.type === 'headquarters' ? 'var(--gold)' : entity.type === 'branch' ? 'var(--green)' : 'var(--blue)'};">
                {entity.type.toUpperCase()}
              </span>
              {#if entity.country} · {entity.country}{/if}
              · {entity.currency}
              {#if entity.taxId} · {entity.taxId}{/if}
            </div>
          </div>
          <a href="/entities/{entity.id}" class="text-xs" style="color: var(--gold);">View →</a>
        </div>
      {/each}
    </div>
  {:else}
    <div class="stat-card text-center py-12">
      <div class="text-3xl mb-3">🏢</div>
      <div style="color: var(--text3); font-size: 12px;">No entities yet. Add your first company or person.</div>
    </div>
  {/if}
</div>
