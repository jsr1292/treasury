<script>
  let { data } = $props();

  const isApiConnector = data.connector?.type === 'api';
  const isDbConnector = data.connector?.entities?.table;

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
  <p class="text-sm text-[var(--text-secondary)] mb-6">Configuration · <a href="/settings/api-connector" class="text-[var(--accent)] hover:underline font-semibold">🔌 API Connector</a></p>

  <!-- Connection status -->
  {#if data.databaseUrl}
  <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
    <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Database Connection</div>
    <div class="flex items-center gap-2 mb-2">
      <div class="w-2.5 h-2.5 rounded-full bg-[var(--green)]"></div>
      <span class="text-sm font-medium">Connected</span>
    </div>
    <div class="mono text-xs text-[var(--text-secondary)] break-all">{data.databaseUrl}</div>
  </div>
  {:else if isApiConnector}
  <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
    <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Data Source</div>
    <div class="flex items-center gap-2 mb-2">
      <div class="w-2.5 h-2.5 rounded-full bg-[var(--green)]"></div>
      <span class="text-sm font-medium">API Connector — {data.connector.name || 'Custom'}</span>
    </div>
  </div>
  {:else}
  <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
    <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Data Source</div>
    <div class="flex items-center gap-2 mb-2">
      <div class="w-2.5 h-2.5 rounded-full bg-[var(--gold)]"></div>
      <span class="text-sm font-medium">No database — use <a href="/settings/api-connector" class="text-[var(--accent)] underline">API Connector</a></span>
    </div>
  </div>
  {/if}

  {#if data.errors.length > 0}
    <div class="bg-[var(--bg-card)] border border-[var(--red)] rounded-2xl p-4 mb-6">
      {#each data.errors as err}
        <div class="text-xs text-[var(--red)]">❌ {err}</div>
      {/each}
    </div>
  {/if}

  {#if isApiConnector && data.connector}
  <!-- API Connector details -->
  <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
    <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Endpoint Mappings</div>

    {#if data.connector.entities?.url}
    <div class="mb-4">
      <div class="text-sm font-bold mb-2">🏢 Entities</div>
      <div class="bg-[var(--bg-dark)] rounded-xl p-3 mono text-xs space-y-1">
        <div>URL: <span class="text-[var(--accent)]">{data.connector.entities.url}</span></div>
        {#if data.connector.entities.dataPath}
          <div>Path: <span class="text-[var(--yellow)]">{data.connector.entities.dataPath}</span></div>
        {/if}
        {#if data.connector.entities.fields}
          <div class="text-[var(--text-secondary)]">
            {#each Object.entries(data.connector.entities.fields) as [our, their]}
              {their} → {our}{#if our !== Object.keys(data.connector.entities.fields).at(-1)}, {/if}
            {/each}
          </div>
        {/if}
      </div>
    </div>
    {/if}

    {#if data.connector.accounts?.url}
    <div class="mb-4">
      <div class="text-sm font-bold mb-2">🏦 Accounts</div>
      <div class="bg-[var(--bg-dark)] rounded-xl p-3 mono text-xs space-y-1">
        <div>URL: <span class="text-[var(--accent)]">{data.connector.accounts.url}</span></div>
        {#if data.connector.accounts.fields}
          <div class="text-[var(--text-secondary)]">
            {#each Object.entries(data.connector.accounts.fields) as [our, their]}
              {their} → {our}{#if our !== Object.keys(data.connector.accounts.fields).at(-1)}, {/if}
            {/each}
          </div>
        {/if}
      </div>
    </div>
    {/if}

    {#if data.connector.balances?.url}
    <div>
      <div class="text-sm font-bold mb-2">💰 Balances</div>
      <div class="bg-[var(--bg-dark)] rounded-xl p-3 mono text-xs space-y-1">
        <div>URL: <span class="text-[var(--accent)]">{data.connector.balances.url}</span></div>
        {#if data.connector.balances.fields}
          <div class="text-[var(--text-secondary)]">
            {#each Object.entries(data.connector.balances.fields) as [our, their]}
              {their} → {our}{#if our !== Object.keys(data.connector.balances.fields).at(-1)}, {/if}
            {/each}
          </div>
        {/if}
      </div>
    </div>
    {/if}
  </div>
  {:else if isDbConnector && data.connector}
  <!-- DB Connector details -->
  <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-6">
    <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Schema Mappings</div>

    {#each [
      { key: 'entities', icon: '🏢', label: 'Entities' },
      { key: 'accounts', icon: '🏦', label: 'Accounts' },
      { key: 'balances', icon: '💰', label: 'Balances' },
    ] as section}
      {#if data.connector[section.key]?.columns}
        <div class="mb-4">
          <div class="text-sm font-bold mb-2">{section.icon} {section.label}</div>
          <div class="bg-[var(--bg-dark)] rounded-xl p-3 mono text-xs space-y-1">
            <div>Table: <span class="text-[var(--accent)]">{data.connector[section.key].table}</span></div>
            <div class="text-[var(--text-secondary)]">
              {#each Object.entries(data.connector[section.key].columns) as [field, col]}
                {col} → {field}{#if field !== Object.keys(data.connector[section.key].columns).at(-1)}, {/if}
              {/each}
            </div>
          </div>
        </div>
      {/if}
    {/each}
  </div>
  {/if}

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
        Setup Connector
      </div>
      <p class="text-sm text-[var(--text-secondary)] mb-3">Use the <a href="/settings/api-connector" class="text-[var(--accent)] underline">API Connector</a> to connect to external APIs, or create a <code class="mono text-[var(--accent)]">connector.json</code> file:</p>
      <pre class="mono text-[10px] text-[var(--text-secondary)] bg-[var(--bg-dark)] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{exampleConfig}</pre>
    </div>
  {/if}
</div>
