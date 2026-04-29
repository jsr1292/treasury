<script>
  let { data } = $props();

  let mode = $derived(data.hasCustom ? 'custom' : 'builtin');

  const exampleConfig = JSON.stringify({
    name: "My Company DB",
    entities: { table: "empresas", columns: { id: "id_empresa", name: "nombre", country: "pais", currency: "moneda" } },
    accounts: { table: "cuentas_bancarias", columns: { id: "id_cuenta", entityId: "id_empresa", name: "descripcion", type: "tipo", currency: "divisa", bankName: "banco" } },
    balances: { mode: "snapshot", table: "saldos_diarios", columns: { accountId: "id_cuenta", date: "fecha", balance: "saldo" } }
  }, null, 2);
</script>

<svelte:head>
  <title>Settings — Treasury</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-6">
  <h1 class="text-2xl font-black mb-1">⚙️ Settings</h1>
  <p class="text-sm text-[var(--text-secondary)] mb-6">Database connector configuration · <a href="/settings/mapper" class="text-[var(--accent)] hover:underline font-semibold">🗺️ Interactive Mapper</a> · <a href="/settings/api-connector" class="text-[var(--accent)] hover:underline font-semibold">🔌 API Connector</a></p>

  <!-- Connection status -->
  <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
    <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Database Connection</div>
    <div class="flex items-center gap-2 mb-2">
      <div class="w-2.5 h-2.5 rounded-full bg-[var(--green)]"></div>
      <span class="text-sm font-medium">Connected</span>
    </div>
    <div class="mono text-xs text-[var(--text-secondary)] break-all">{data.databaseUrl}</div>
  </div>

  <!-- Active connector -->
  <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
    <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
      Active Connector
    </div>
    <div class="flex items-center gap-3 mb-3">
      <div class="px-3 py-1 rounded-full text-xs font-bold {mode === 'builtin' ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-[var(--yellow)]/20 text-[var(--yellow)]'}">
        {mode === 'builtin' ? 'Built-in Schema' : 'Custom Connector'}
      </div>
    </div>

    {#if data.errors.length > 0}
      <div class="mb-3">
        {#each data.errors as err}
          <div class="text-xs text-[var(--red)]">❌ {err}</div>
        {/each}
      </div>
    {/if}

    <!-- Entity mapping -->
    <div class="mb-4">
      <div class="text-sm font-bold mb-2">🏢 Entities</div>
      <div class="bg-[var(--bg-dark)] rounded-xl p-3 mono text-xs space-y-1">
        <div>Table: <span class="text-[var(--accent)]">{data.connector.entities.table}</span></div>
        <div class="text-[var(--text-secondary)]">
          {#each Object.entries(data.connector.entities.columns) as [field, col]}
            {col} → {field}{#if field !== Object.keys(data.connector.entities.columns).at(-1)}, {/if}
          {/each}
        </div>
      </div>
    </div>

    <!-- Account mapping -->
    <div class="mb-4">
      <div class="text-sm font-bold mb-2">🏦 Accounts</div>
      <div class="bg-[var(--bg-dark)] rounded-xl p-3 mono text-xs space-y-1">
        <div>Table: <span class="text-[var(--accent)]">{data.connector.accounts.table}</span></div>
        <div class="text-[var(--text-secondary)]">
          {#each Object.entries(data.connector.accounts.columns) as [field, col]}
            {col} → {field}{#if field !== Object.keys(data.connector.accounts.columns).at(-1)}, {/if}
          {/each}
        </div>
      </div>
    </div>

    <!-- Balance mapping -->
    <div>
      <div class="text-sm font-bold mb-2">📊 Balances</div>
      <div class="bg-[var(--bg-dark)] rounded-xl p-3 mono text-xs space-y-1">
        <div>Table: <span class="text-[var(--accent)]">{data.connector.balances.table}</span></div>
        <div>Mode: <span class="text-[var(--yellow)]">{data.connector.balances.mode}</span></div>
        <div class="text-[var(--text-secondary)]">
          {#each Object.entries(data.connector.balances.columns) as [field, col]}
            {col} → {field}{#if field !== Object.keys(data.connector.balances.columns).at(-1)}, {/if}
          {/each}
        </div>
      </div>
    </div>
  </div>

  <!-- Raw config -->
  {#if data.rawJson}
    <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
      <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        connector.json
      </div>
      <pre class="mono text-xs text-[var(--text-secondary)] bg-[var(--bg-dark)] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{data.rawJson}</pre>
    </div>
  {:else}
    <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4">
      <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        Setup Custom Connector
      </div>
      <p class="text-sm text-[var(--text-secondary)] mb-3">Create a <code class="mono text-[var(--accent)]">connector.json</code> file in the project root to map your own database:</p>
      <pre class="mono text-[10px] text-[var(--text-secondary)] bg-[var(--bg-dark)] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{exampleConfig}</pre>
    </div>
  {/if}
</div>
