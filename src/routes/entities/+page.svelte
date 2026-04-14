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

  const typeLabels = {
    headquarters: { label: 'HQ', color: 'text-[var(--accent)]' },
    branch: { label: 'Branch', color: 'text-[var(--green)]' },
    subsidiary: { label: 'Sub', color: 'text-[var(--yellow)]' },
  };

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
      <h1 class="text-2xl font-black">🏢 Entities</h1>
      <p class="text-sm text-[var(--text-secondary)]">Companies, branches & subsidiaries</p>
    </div>
    <button onclick={() => showForm = !showForm}
      class="px-4 py-2 bg-[var(--accent)] text-white font-bold rounded-lg text-sm hover:bg-blue-600">
      {showForm ? 'Cancel' : '+ Add Entity'}
    </button>
  </div>

  <!-- Add entity form -->
  {#if showForm}
    <form onsubmit={handleSubmit} class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-6 space-y-3">
      <div>
        <label for="ename" class="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Name</label>
        <input id="ename" type="text" bind:value={name} placeholder="Grupo XYZ S.A." required
          class="w-full px-3 py-3 bg-[var(--bg-dark)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="etype" class="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Type</label>
          <select id="etype" bind:value={type}
            class="w-full px-3 py-3 bg-[var(--bg-dark)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]">
            <option value="headquarters">Headquarters</option>
            <option value="branch">Branch</option>
            <option value="subsidiary">Subsidiary</option>
          </select>
        </div>
        <div>
          <label for="ecur" class="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Currency</label>
          <input id="ecur" type="text" bind:value={currency} placeholder="EUR"
            class="w-full px-3 py-3 bg-[var(--bg-dark)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="ecountry" class="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Country</label>
          <input id="ecountry" type="text" bind:value={country} placeholder="ES"
            class="w-full px-3 py-3 bg-[var(--bg-dark)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
        </div>
        <div>
          <label for="etax" class="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Tax ID</label>
          <input id="etax" type="text" bind:value={taxId} placeholder="B12345678"
            class="w-full px-3 py-3 bg-[var(--bg-dark)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
        </div>
      </div>
      <button type="submit" disabled={submitting || !name.trim()}
        class="w-full py-3 bg-[var(--accent)] text-white font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50">
        {submitting ? 'Creating...' : 'Create Entity'}
      </button>
    </form>
  {/if}

  <!-- Entity list -->
  {#if entities.length > 0}
    <div class="space-y-2">
      {#each entities as entity}
        <div class="px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl">
          <div class="flex items-center gap-3">
            <div class="text-lg">{entity.type === 'headquarters' ? '🏢' : entity.type === 'branch' ? '📍' : '🏗️'}</div>
            <div class="flex-1">
              <div class="font-bold text-sm">{entity.name}</div>
              <div class="text-xs text-[var(--text-secondary)]">
                <span class="{typeLabels[entity.type]?.color}">{typeLabels[entity.type]?.label}</span>
                {#if entity.country} · {entity.country}{/if}
                · {entity.currency}
                {#if entity.taxId} · {entity.taxId}{/if}
              </div>
            </div>
            <a href="/entities/{entity.id}" class="text-xs text-[var(--accent)] hover:underline">View →</a>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="text-center py-12 text-[var(--text-secondary)]">
      <div class="text-4xl mb-3">🏢</div>
      <p>No entities yet. Add your first company or person.</p>
    </div>
  {/if}
</div>
