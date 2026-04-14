<script>
  /**
   * Interactive Schema Mapper — visualize database tables, drag to connect.
   * Reads schema from /api/schema, renders as interactive ERD.
   */
  let { data } = $props();

  let tables = $derived(data.schema?.tables || []);
  let error = $derived(data.schema?.error || null);
  let selectedTable = $state(null);
  let mapping = $state({});  // { tableName: { ourField: theirColumn } }
  let mappingMode = $state(false); // true = user is mapping
  let mappingTarget = $state(null); // which our-field they're mapping
  let connectorName = $state('');
  let balancesMode = $state('snapshot');

  const typeColors = {
    'uuid': '#3b82f6',
    'text': '#30d158',
    'character varying': '#30d158',
    'integer': '#ffd60a',
    'numeric': '#ffd60a',
    'bigint': '#ffd60a',
    'boolean': '#ff2d55',
    'date': '#a855f7',
    'timestamp without time zone': '#a855f7',
    'timestamp with time zone': '#a855f7',
    'jsonb': '#f97316',
    'USER-DEFINED': '#f97316',
  };

  function getTypeColor(type) {
    return typeColors[type] || '#8888a0';
  }

  function selectTable(table) {
    selectedTable = selectedTable?.name === table.name ? null : table;
  }

  function startMapping(ourField) {
    mappingMode = true;
    mappingTarget = ourField;
  }

  function mapColumn(table, column) {
    if (!mappingMode || !mappingTarget) return;
    if (!mapping[table.name]) mapping[table.name] = {};
    mapping[table.name][mappingTarget] = column.name;
    mappingMode = false;
    mappingTarget = null;
  }

  function getMappedColumn(tableName, field) {
    return mapping[tableName]?.[field] || null;
  }

  function isColumnMapped(tableName, columnName) {
    const m = mapping[tableName];
    if (!m) return false;
    return Object.values(m).includes(columnName);
  }

  // Generate connector.json
  function generateConnector() {
    const entTable = Object.keys(mapping).find(t => mapping[t].id && mapping[t].name) || '';
    const acctTable = Object.keys(mapping).find(t => t !== entTable && mapping[t]?.id && mapping[t]?.entityId) || '';
    const balTable = Object.keys(mapping).find(t => t !== entTable && t !== acctTable && mapping[t]?.accountId && mapping[t]?.date) || '';

    const connector = {
      name: connectorName || 'Custom Connector',
      version: 1,
      entities: { table: entTable, columns: mapping[entTable] || {} },
      accounts: { table: acctTable, columns: mapping[acctTable] || {} },
      balances: { mode: balancesMode, table: balTable, columns: mapping[balTable] || {} },
    };

    return JSON.stringify(connector, null, 2);
  }

  let showOutput = $state(false);

  // Our expected fields for each section
  const entityFields = ['id', 'name', 'type', 'parentId', 'country', 'currency', 'taxId'];
  const accountFields = ['id', 'entityId', 'name', 'type', 'currency', 'accountNumber', 'bankName', 'isActive'];
  const balanceFields = ['id', 'accountId', 'date', 'balance', 'currency'];
</script>

<svelte:head>
  <title>Schema Mapper — Treasury</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-6">
  <div class="flex items-center gap-3 mb-6">
    <a href="/settings" class="text-xs text-[var(--text-secondary)] hover:text-[var(--accent)]">← Settings</a>
  </div>

  <h1 class="text-2xl font-black mb-1">🗺️ Schema Mapper</h1>
  <p class="text-sm text-[var(--text-secondary)] mb-6">Visualize your database and map columns to the treasury app</p>

  {#if error}
    <div class="bg-red-950/30 border border-red-500/20 rounded-xl p-4 mb-6">
      <p class="text-red-400 text-sm">Error: {error}</p>
    </div>
  {/if}

  <!-- Step 1: Name -->
  <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-4">
    <label for="cname" class="block text-xs font-semibold text-[var(--text-secondary)] mb-1">Connector Name</label>
    <input id="cname" type="text" bind:value={connectorName} placeholder="My Company DB"
      class="w-full px-3 py-3 bg-[var(--bg-dark)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
  </div>

  <!-- Instructions -->
  <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-4">
    <div class="text-sm font-bold mb-2">How to map:</div>
    <ol class="text-xs text-[var(--text-secondary)] space-y-1 list-decimal list-inside">
      <li>Click a field from "Our Schema" below (e.g. "entities → id")</li>
      <li>Then click the matching column in your database tables</li>
      <li>Repeat for all required fields (marked with *)</li>
      <li>Click "Generate Connector" when done</li>
    </ol>
  </div>

  <!-- Our schema fields (left panel) -->
  <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-4 mb-4">
    <div class="text-sm font-bold mb-3">Our Schema — click a field to map it</div>

    {#each [
      { section: 'entities', label: '🏢 Entities', fields: entityFields },
      { section: 'accounts', label: '🏦 Accounts', fields: accountFields },
      { section: 'balances', label: '📊 Balances', fields: balanceFields },
    ] as group}
      <div class="mb-3">
        <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">{group.label}</div>
        <div class="flex flex-wrap gap-1.5">
          {#each group.fields as field}
            {@const required = (field === 'id' || field === 'name' || field === 'entityId' || field === 'accountId' || field === 'date' || field === 'balance')}
            <button
              onclick={() => startMapping(`${group.section}.${field}`)}
              class="px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors
                {mappingTarget === `${group.section}.${field}`
                  ? 'border-[var(--accent)] bg-blue-950/50 text-[var(--accent)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)]'}"
            >
              {field}{required ? ' *' : ''}
            </button>
          {/each}
        </div>
      </div>
    {/each}

    {#if mappingMode}
      <div class="mt-2 px-3 py-2 bg-blue-950/30 border border-[var(--accent)]/30 rounded-lg text-xs text-[var(--accent)]">
        Now click a column in your tables below to map it to <strong>{mappingTarget}</strong>
      </div>
    {/if}

    <!-- Balances mode -->
    <div class="mt-3 pt-3 border-t border-[var(--border)]">
      <div class="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Balances mode</div>
      <div class="flex gap-2">
        <button onclick={() => balancesMode = 'snapshot'}
          class="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors
            {balancesMode === 'snapshot' ? 'border-[var(--accent)] bg-blue-950/50 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}">
          📸 Snapshot
        </button>
        <button onclick={() => balancesMode = 'transaction'}
          class="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors
            {balancesMode === 'transaction' ? 'border-[var(--accent)] bg-blue-950/50 text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}">
          💳 Transaction
        </button>
      </div>
    </div>
  </div>

  <!-- Database tables (visual ERD) -->
  <div class="mb-6">
    <div class="text-sm font-bold mb-3">Your Database</div>
    <div class="space-y-3">
      {#each tables as table}
        <div class="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <!-- Table header -->
          <button onclick={() => selectTable(table)}
            class="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-card-hover)] transition-colors">
            <div class="flex items-center gap-2">
              <span class="text-sm">🗃️</span>
              <span class="font-bold text-sm">{table.name}</span>
              <span class="text-[10px] text-[var(--text-secondary)]">{table.columns.length} cols · {table.foreignKeys.length} FKs</span>
            </div>
            <span class="text-xs text-[var(--text-secondary)]">{selectedTable?.name === table.name ? '▲' : '▼'}</span>
          </button>

          <!-- Columns (expanded) -->
          {#if selectedTable?.name === table.name}
            <div class="border-t border-[var(--border)] px-4 py-3 space-y-1.5">
              {#each table.columns as column}
                <button
                  onclick={() => mapColumn(table, column)}
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors
                    {isColumnMapped(table.name, column.name)
                      ? 'bg-blue-950/30 border border-[var(--accent)]/30'
                      : 'hover:bg-[var(--bg-card-hover)] border border-transparent'}"
                >
                  <!-- Type indicator -->
                  <div class="w-2 h-2 rounded-full" style="background: {getTypeColor(column.type)}"></div>
                  <!-- Column name -->
                  <span class="font-medium flex-1 text-left">{column.name}</span>
                  <!-- Type -->
                  <span class="text-[var(--text-secondary)] mono">{column.type}</span>
                  <!-- Mapped indicator -->
                  {#if isColumnMapped(table.name, column.name)}
                    <span class="text-[var(--accent)]">✓ mapped</span>
                  {/if}
                </button>
              {/each}

              <!-- Foreign keys -->
              {#if table.foreignKeys.length > 0}
                <div class="mt-2 pt-2 border-t border-[var(--border)]">
                  {#each table.foreignKeys as fk}
                    <div class="text-[10px] text-[var(--text-secondary)]">
                      🔗 {fk.column} → {fk.references.table}.{fk.references.column}
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>

  <!-- Generate output -->
  <button onclick={() => showOutput = true}
    class="w-full py-3.5 bg-[var(--accent)] text-white font-bold rounded-xl hover:bg-blue-600 transition-colors text-lg mb-6">
    Generate connector.json
  </button>

  {#if showOutput}
    <div class="bg-[var(--bg-card)] border border-[var(--accent)]/30 rounded-2xl p-4">
      <div class="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        Generated connector.json
      </div>
      <pre class="mono text-xs text-[var(--text-primary)] bg-[var(--bg-dark)] rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">{generateConnector()}</pre>
      <p class="text-xs text-[var(--text-secondary)] mt-2">Save this as <code class="text-[var(--accent)]">connector.json</code> in the project root and restart the server.</p>
    </div>
  {/if}
</div>
