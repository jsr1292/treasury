<script lang="ts">
  import { onMount } from 'svelte';
  import FieldMapper from '$lib/components/FieldMapper.svelte';
  import TransformBuilder from '$lib/components/TransformBuilder.svelte';
  import type { TransformStep } from '$lib/connector/transforms';

  let { data } = $props();

  // ─── Multi-company state ─────────────────────────────────────────
  let companies = $state<{ name: string; connector: any }[]>([]);
  let activeCompanyIndex = $state(0);
  let isMultiCompany = $state(false);

  // Auth
  let authType = $state<'none' | 'bearer' | 'basic' | 'api-key'>('none');
  let authToken = $state('');
  let authUsername = $state('');
  let authPassword = $state('');
  let authHeaderName = $state('X-API-Key');
  let authApiKey = $state('');

  // API endpoints
  let entitiesUrl = $state('');
  let accountsUrl = $state('');
  let balancesUrl = $state('');

  // Data paths
  let entitiesDataPath = $state('');
  let accountsDataPath = $state('');
  let balancesDataPath = $state('');

  // Pagination per endpoint
  let entitiesPaginationType = $state<'none' | 'offset' | 'cursor' | 'link_header'>('none');
  let accountsPaginationType = $state<'none' | 'offset' | 'cursor' | 'link_header'>('none');
  let balancesPaginationType = $state<'none' | 'offset' | 'cursor' | 'link_header'>('none');
  let entitiesPaginationPageSize = $state(100);
  let accountsPaginationPageSize = $state(100);
  let balancesPaginationPageSize = $state(100);
  let entitiesPaginationCursorPath = $state('');
  let accountsPaginationCursorPath = $state('');
  let balancesPaginationCursorPath = $state('');

  // Visual mapper connections
  let entityConnections = $state<Record<string, string>>({});
  let accountConnections = $state<Record<string, string>>({});
  let balanceConnections = $state<Record<string, string>>({});

  // Detected API fields per endpoint
  let entityApiFields = $state<string[]>([]);
  let accountApiFields = $state<string[]>([]);
  let balanceApiFields = $state<string[]>([]);

  // Sample values per endpoint
  let entitySamples = $state<Record<string, string>>({});
  let accountSamples = $state<Record<string, string>>({});
  let balanceSamples = $state<Record<string, string>>({});

  // Transforms per internal field key
  let entityTransforms = $state<Record<string, TransformStep[]>>({});
  let accountTransforms = $state<Record<string, TransformStep[]>>({});
  let balanceTransforms = $state<Record<string, TransformStep[]>>({});

  // Extra
  let cacheTtl = $state(1800);
  let timeout = $state(15000);
  let refreshInterval = $state(0);

  // Joins
  let joins = $state<{ fromField: string; toField: string; method: 'exact' | 'contains' | 'fuzzy'; fuzzyThreshold: number }[]>([]);
  let showJoinForm = $state(false);
  let newJoin = $state({ fromField: 'entityName', toField: 'name', method: 'fuzzy' as const, fuzzyThreshold: 0.85 });

  // State
  let saving = $state(false);
  let saved = $state(false);
  let testing = $state(false);
  let testResult = $state<{ ok: boolean; message: string; latencyMs: number } | null>(null);
  let error = $state('');
  let detecting = $state('');

  // Internal field definitions per endpoint
  const entityInternalFields = [
    { key: 'name', label: 'Company name', icon: '🏢', hint: 'The full company name', required: true },
    { key: 'type', label: 'Entity type', icon: '🏷️', hint: 'Headquarters, Branch, Subsidiary...' },
    { key: 'currency', label: 'Currency', icon: '💱', hint: 'EUR, USD, PEN...' },
    { key: 'country', label: 'Country', icon: '🌍', hint: 'Country name or code' },
    { key: 'parentId', label: 'Parent company', icon: '🔗', hint: 'Links branch to HQ' },
    { key: 'id', label: 'ID', icon: '🔑', hint: 'Unique identifier' },
  ];

  const accountInternalFields = [
    { key: 'name', label: 'Account name', icon: '📝', hint: 'e.g. Sabadell Madrid', required: true },
    { key: 'entityName', label: 'Company', icon: '🏢', hint: 'Which company owns this account', required: true },
    { key: 'type', label: 'Account type', icon: '🏷️', hint: 'Checking, savings...' },
    { key: 'bankName', label: 'Bank name', icon: '🏦', hint: 'e.g. Banco Sabadell' },
    { key: 'currency', label: 'Currency', icon: '💱', hint: 'EUR, USD, PEN...' },
    { key: 'country', label: 'Country', icon: '🌍', hint: 'Country of the account' },
  ];

  const balanceInternalFields = [
    { key: 'accountId', label: 'Account', icon: '📝', hint: 'Which account this balance is for', required: true },
    { key: 'balance', label: 'Amount (EUR)', icon: '💶', hint: 'Balance in euros', required: true },
    { key: 'date', label: 'Date', icon: '📅', hint: 'When this balance was recorded' },
    { key: 'entityName', label: 'Company', icon: '🏢', hint: 'Company name' },
    { key: 'bankName', label: 'Bank', icon: '🏦', hint: 'Bank name' },
    { key: 'balanceLocal', label: 'Amount (local)', icon: '💵', hint: 'Balance in original currency' },
  ];

  // Load existing config
  onMount(() => {
    loadFromConnector();
  });

  function loadFromConnector() {
    if (!data.connector) return;

    // Multi-company format
    if (data.connector.companies && Array.isArray(data.connector.companies)) {
      isMultiCompany = true;
      companies = data.connector.companies.map((c: any) => ({
        name: c.name || 'Company',
        connector: c.connector || {},
      }));
      if (companies.length === 0) {
        companies = [{ name: 'Company 1', connector: {} }];
      }
      loadCompanyConfig(0);
      return;
    }

    // Legacy single-connector format — convert to multi-company
    isMultiCompany = false;
    const c = data.connector;
    if (c.type === 'api') {
      companies = [{ name: c.name || 'Company', connector: c }];
      loadCompanyConfig(0);
    }
  }

  function loadCompanyConfig(idx: number) {
    activeCompanyIndex = idx;
    const c = companies[idx]?.connector || {};
    
    authType = c.auth?.type || 'none';
    authToken = c.auth?.token || '';
    authUsername = c.auth?.username || '';
    authPassword = c.auth?.password || '';
    authHeaderName = c.auth?.headerName || 'X-API-Key';
    authApiKey = c.auth?.apiKey || '';
    cacheTtl = c.cacheTtl || 1800;
    timeout = c.timeout || 15000;
    refreshInterval = c.refreshInterval || 0;
    entitiesUrl = c.entities?.url || '';
    accountsUrl = c.accounts?.url || '';
    balancesUrl = c.balances?.url || '';
    entitiesDataPath = c.entities?.dataPath || '';
    accountsDataPath = c.accounts?.dataPath || '';
    balancesDataPath = c.balances?.dataPath || '';

    // Pagination
    entitiesPaginationType = c.entities?.pagination?.type || 'none';
    accountsPaginationType = c.accounts?.pagination?.type || 'none';
    balancesPaginationType = c.balances?.pagination?.type || 'none';
    entitiesPaginationPageSize = c.entities?.pagination?.pageSize || 100;
    accountsPaginationPageSize = c.accounts?.pagination?.pageSize || 100;
    balancesPaginationPageSize = c.balances?.pagination?.pageSize || 100;
    entitiesPaginationCursorPath = c.entities?.pagination?.cursorPath || '';
    accountsPaginationCursorPath = c.accounts?.pagination?.cursorPath || '';
    balancesPaginationCursorPath = c.balances?.pagination?.cursorPath || '';
    
    // Clear mapper state
    entityConnections = reverseMap(c.entities?.fields);
    accountConnections = reverseMap(c.accounts?.fields);
    balanceConnections = reverseMap(c.balances?.fields);
    entityApiFields = [];
    accountApiFields = [];
    balanceApiFields = [];
    entitySamples = {};
    accountSamples = {};
    balanceSamples = {};

    // Load transforms from saved config
    entityTransforms = loadTransforms(c.entities?.fields);
    accountTransforms = loadTransforms(c.accounts?.fields);
    balanceTransforms = loadTransforms(c.balances?.fields);

    // Load joins
    joins = (c.joins || []).map((j: any) => ({
      fromField: j.fromField || 'entityName',
      toField: j.toField || 'name',
      method: j.method || 'fuzzy',
      fuzzyThreshold: j.fuzzyThreshold ?? 0.85,
    }));
  }

  function loadTransforms(fields: Record<string, any>): Record<string, TransformStep[]> {
    const result: Record<string, TransformStep[]> = {};
    if (!fields) return result;
    for (const [internalKey, fieldValue] of Object.entries(fields)) {
      if (fieldValue && typeof fieldValue === 'object' && 'transforms' in fieldValue && Array.isArray(fieldValue.transforms)) {
        result[internalKey] = fieldValue.transforms;
      }
    }
    return result;
  }

  function switchCompany(idx: number) {
    // Save current company state first
    saveCompanyConfig(activeCompanyIndex);
    loadCompanyConfig(idx);
  }

  function saveCompanyConfig(idx: number) {
    companies[idx] = {
      name: companies[idx]?.name || `Company ${idx + 1}`,
      connector: buildConfig(),
    };
  }

  function addCompany() {
    saveCompanyConfig(activeCompanyIndex);
    companies = [...companies, { name: `Company ${companies.length + 1}`, connector: {} }];
    loadCompanyConfig(companies.length - 1);
  }

  function removeCompany(idx: number) {
    if (companies.length <= 1) return;
    companies = companies.filter((_, i) => i !== idx);
    if (activeCompanyIndex >= companies.length) {
      activeCompanyIndex = companies.length - 1;
    }
    loadCompanyConfig(activeCompanyIndex);
  }

  function updateCompanyName(idx: number, name: string) {
    companies[idx].name = name;
  }

  // fields stored as { ourField: theirField } but mapper uses { theirField: ourField }
  function reverseMap(fields: Record<string, string>): Record<string, string> {
    if (!fields) return {};
    const reversed: Record<string, string> = {};
    for (const [our, their] of Object.entries(fields)) {
      reversed[their] = our;
    }
    return reversed;
  }

  function connectionsToFields(conns: Record<string, string>, transforms: Record<string, TransformStep[]>): Record<string, any> {
    const fields: Record<string, any> = {};
    for (const [apiField, internalKey] of Object.entries(conns)) {
      const fieldConfig: any = { source: apiField };
      if (transforms[internalKey]?.length) {
        fieldConfig.transforms = transforms[internalKey];
      }
      fields[internalKey] = fieldConfig;
    }
    return fields;
  }

  function getAuthPayload() {
    const auth: any = { type: authType };
    if (authType === 'bearer') auth.token = authToken;
    if (authType === 'basic') { auth.username = authUsername; auth.password = authPassword; }
    if (authType === 'api-key') { auth.headerName = authHeaderName; auth.apiKey = authApiKey; }
    return auth;
  }

  function buildPaginationConfig(type: string, pageSize: number, cursorPath: string) {
    if (type === 'none') return undefined;
    const cfg: any = { type };
    if (type === 'offset') { cfg.pageSize = pageSize; }
    if (type === 'cursor') { cfg.cursorPath = cursorPath || 'next_cursor'; }
    return cfg;
  }

  // ─── Join management ──────────────────────────────────────────────

  function addJoin() {
    joins = [...joins, { ...newJoin }];
    showJoinForm = false;
    newJoin = { fromField: 'entityName', toField: 'name', method: 'fuzzy', fuzzyThreshold: 0.85 };
  }

  function removeJoin(index: number) {
    joins = joins.filter((_, i) => i !== index);
  }

  function buildConfig() {
    return {
      type: 'api',
      version: 1,
      auth: getAuthPayload(),
      cacheTtl,
      timeout,
      refreshInterval,
      entities: { url: entitiesUrl, fields: connectionsToFields(entityConnections, entityTransforms), ...(entitiesDataPath ? { dataPath: entitiesDataPath } : {}), ...(buildPaginationConfig(entitiesPaginationType, entitiesPaginationPageSize, entitiesPaginationCursorPath) ? { pagination: buildPaginationConfig(entitiesPaginationType, entitiesPaginationPageSize, entitiesPaginationCursorPath) } : {}) },
      accounts: { url: accountsUrl, fields: connectionsToFields(accountConnections, accountTransforms), ...(accountsDataPath ? { dataPath: accountsDataPath } : {}), ...(buildPaginationConfig(accountsPaginationType, accountsPaginationPageSize, accountsPaginationCursorPath) ? { pagination: buildPaginationConfig(accountsPaginationType, accountsPaginationPageSize, accountsPaginationCursorPath) } : {}) },
      balances: { url: balancesUrl, fields: connectionsToFields(balanceConnections, balanceTransforms), ...(balancesDataPath ? { dataPath: balancesDataPath } : {}), ...(buildPaginationConfig(balancesPaginationType, balancesPaginationPageSize, balancesPaginationCursorPath) ? { pagination: buildPaginationConfig(balancesPaginationType, balancesPaginationPageSize, balancesPaginationCursorPath) } : {}) },
      ...(joins.length > 0 ? { joins } : {}),
    };
  }

  async function autoDetect(endpoint: 'entities' | 'accounts' | 'balances') {
    const urls = { entities: entitiesUrl, accounts: accountsUrl, balances: balancesUrl || accountsUrl };
    const url = urls[endpoint];
    if (!url) return;

    const dataPath = endpoint === 'entities' ? entitiesDataPath : endpoint === 'accounts' ? accountsDataPath : balancesDataPath;
    
    detecting = endpoint;
    try {
      const res = await fetch('/api/connector/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, auth: getAuthPayload(), dataPath }),
      });
      const result = await res.json();

      if (result.error) {
        error = result.error;
      } else {
        error = '';
        const apiKeys = result.keys || [];
        const samples: Record<string, string> = {};
        if (result.sample) {
          for (const key of apiKeys) {
            const val = result.sample[key];
            if (val !== undefined && val !== null && val !== '') {
              samples[key] = typeof val === 'object' ? JSON.stringify(val) : String(val);
              if (samples[key].length > 30) samples[key] = samples[key].substring(0, 30) + '…';
            }
          }
        }
        if (endpoint === 'entities') { entityApiFields = apiKeys; entitySamples = samples; if (result.suggestedDataPath) entitiesDataPath = result.suggestedDataPath; }
        else if (endpoint === 'accounts') { accountApiFields = apiKeys; accountSamples = samples; if (result.suggestedDataPath) accountsDataPath = result.suggestedDataPath; }
        else { balanceApiFields = apiKeys; balanceSamples = samples; if (result.suggestedDataPath) balancesDataPath = result.suggestedDataPath; }

        const d = result.detected;
        const conns: Record<string, string> = {};
        for (const [internalKey, apiField] of Object.entries(d)) {
          if (apiField) conns[apiField] = internalKey;
        }
        if (endpoint === 'entities') entityConnections = conns;
        else if (endpoint === 'accounts') accountConnections = conns;
        else balanceConnections = conns;
      }
    } catch (e: any) {
      error = e.message;
    }
    detecting = '';
  }

  async function save() {
    saving = true; error = '';
    try {
      // Save current company config first
      saveCompanyConfig(activeCompanyIndex);
      
      const config = isMultiCompany
        ? { companies: companies }
        : buildConfig();

      const res = await fetch('/api/connector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) { saved = true; setTimeout(() => saved = false, 2000); }
      else { const d = await res.json(); error = d.error || 'Save failed'; }
    } catch (e: any) { error = e.message; }
    saving = false;
  }

  async function testConnection() {
    testing = true; testResult = null;
    try {
      // Save current company config first
      saveCompanyConfig(activeCompanyIndex);
      const config = isMultiCompany
        ? { companies: companies }
        : buildConfig();

      const res = await fetch('/api/connector/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isMultiCompany ? companies[activeCompanyIndex].connector : config),
      });
      testResult = await res.json();
    } catch (e: any) {
      testResult = { ok: false, message: e.message, latencyMs: 0 };
    }
    testing = false;
  }

  function exportConfig() {
    saveCompanyConfig(activeCompanyIndex);
    const config = isMultiCompany
      ? { companies: companies }
      : buildConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'connector.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importConfig(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target?.result as string);
        if (config.companies && Array.isArray(config.companies)) {
          isMultiCompany = true;
          companies = config.companies.map((c: any) => ({
            name: c.name || 'Company',
            connector: c.connector || c,
          }));
          loadCompanyConfig(0);
        } else {
          isMultiCompany = false;
          companies = [{ name: config.name || 'Company', connector: config }];
          loadCompanyConfig(0);
        }
        error = '';
      } catch (err) {
        error = 'Invalid connector JSON file';
      }
    };
    reader.readAsText(file);
    // Reset input so same file can be re-imported
    (event.target as HTMLInputElement).value = '';
  }

  const inputStyle = 'width: 100%; font-size: 12px; padding: 8px 10px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text);';
  const labelStyle = 'display: block; font-size: 9px; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;';

  // Helper: get sample value for an internal key (via its apiField)
  function getSampleValue(conns: Record<string, string>, samples: Record<string, string>, internalKey: string): string | undefined {
    const apiField = Object.entries(conns).find(([, k]) => k === internalKey)?.[0];
    if (!apiField) return undefined;
    return samples[apiField];
  }

  // Helper: update transforms for an internal key
  function updateEntityTransforms(internalKey: string, steps: TransformStep[]) {
    entityTransforms = { ...entityTransforms, [internalKey]: steps };
  }
  function updateAccountTransforms(internalKey: string, steps: TransformStep[]) {
    accountTransforms = { ...accountTransforms, [internalKey]: steps };
  }
  function updateBalanceTransforms(internalKey: string, steps: TransformStep[]) {
    balanceTransforms = { ...balanceTransforms, [internalKey]: steps };
  }

  // Connected internal keys for each endpoint
  let connectedEntityKeys = $derived(() => Object.values(entityConnections));
  let connectedAccountKeys = $derived(() => Object.values(accountConnections));
  let connectedBalanceKeys = $derived(() => Object.values(balanceConnections));
</script>

<div style="max-width: 720px; margin: 0 auto;">
  <a href="/settings" style="font-size: 10px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; margin-bottom: 16px;">← Settings</a>

  <h1 style="font-family: 'Libre Baskerville', serif; font-size: 18px; color: var(--gold); margin-bottom: 4px;">🔌 API Connector</h1>
  <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 20px;">
    {#if isMultiCompany}
      Manage multiple company API connections. Each company can have its own API endpoint.
    {:else}
      Enter your API URL, click <strong>Auto-detect</strong>, then connect fields visually.
    {/if}
  </p>

  {#if error}
    <div style="padding: 10px 14px; background: rgba(255,77,106,0.1); border: 1px solid var(--red); border-radius: 6px; font-size: 11px; color: var(--red); margin-bottom: 16px;">{error}</div>
  {/if}

  <!-- Multi-company mode toggle & tabs -->
  {#if companies.length > 0}
    <div class="glass-card" style="padding: 12px 16px; margin-bottom: 12px;">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" bind:checked={isMultiCompany} onchange={() => { if (isMultiCompany && companies.length === 1) { companies = [...companies, { name: 'Company 2', connector: {} }]; } }} style="accent-color: var(--gold); width: 14px; height: 14px;" />
            <span style="font-size: 11px; color: var(--text);">Multi-company mode</span>
          </label>
        </div>
        {#if isMultiCompany && companies.length > 1}
          <button onclick={removeCompany} style="font-size: 10px; padding: 4px 10px; border: 1px solid rgba(255,77,106,0.3); border-radius: 4px; background: rgba(255,77,106,0.05); color: var(--red); cursor: pointer;">
            Remove current
          </button>
        {/if}
      </div>

      {#if isMultiCompany}
        <!-- Company tabs -->
        <div class="flex items-center gap-2 mt-3 flex-wrap">
          {#each companies as company, i}
            <button
              onclick={() => switchCompany(i)}
              style="font-size: 11px; padding: 5px 12px; border-radius: 6px; cursor: pointer; border: 1px solid {activeCompanyIndex === i ? 'var(--gold)' : 'var(--glass-border)'}; background: {activeCompanyIndex === i ? 'rgba(201,168,76,0.12)' : 'transparent'}; color: {activeCompanyIndex === i ? 'var(--gold)' : 'var(--text3)'}; transition: all 0.15s;"
            >
              {company.name}
            </button>
          {/each}
          <button onclick={addCompany} style="font-size: 11px; padding: 5px 12px; border-radius: 6px; cursor: pointer; border: 1px dashed var(--glass-border); background: transparent; color: var(--text3); transition: all 0.15s;">
            + Add company
          </button>
        </div>

        <!-- Company name editor -->
        <div class="mt-3">
          <input
            type="text"
            value={companies[activeCompanyIndex]?.name || ''}
            oninput={(e) => updateCompanyName(activeCompanyIndex, e.currentTarget.value)}
            placeholder="Company name"
            style="{inputStyle} max-width: 240px;"
          />
        </div>
      {/if}
    </div>
  {/if}

  <!-- Auth -->
  <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
    <div style="font-size: 11px; font-weight: 600; color: var(--text); margin-bottom: 12px;">Authentication</div>
    <div style="margin-bottom: 10px;">
      <label style={labelStyle}>Type</label>
      <select bind:value={authType} style={inputStyle}>
        <option value="none">None</option>
        <option value="bearer">Bearer Token</option>
        <option value="basic">Basic Auth</option>
        <option value="api-key">API Key (Header)</option>
      </select>
    </div>
    {#if authType === 'bearer'}
      <div><label style={labelStyle}>Token</label><input type="password" bind:value={authToken} placeholder="eyJ..." style={inputStyle} /></div>
    {:else if authType === 'basic'}
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div><label style={labelStyle}>Username</label><input bind:value={authUsername} style={inputStyle} /></div>
        <div><label style={labelStyle}>Password</label><input type="password" bind:value={authPassword} style={inputStyle} /></div>
      </div>
    {:else if authType === 'api-key'}
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div><label style={labelStyle}>Header name</label><input bind:value={authHeaderName} placeholder="X-API-Key" style={inputStyle} /></div>
        <div><label style={labelStyle}>API Key</label><input type="password" bind:value={authApiKey} style={inputStyle} /></div>
      </div>
    {/if}
  </div>

  <!-- Endpoint: Entities -->
  <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
      <span style="font-size: 14px;">🏢</span>
      <div style="font-size: 11px; font-weight: 600; color: var(--text); flex: 1;">Entities</div>
      <button onclick={() => autoDetect('entities')} disabled={!entitiesUrl || detecting === 'entities'} style="font-size: 9px; padding: 4px 10px; border: 1px solid var(--gold); border-radius: 4px; background: rgba(201,168,76,0.1); color: var(--gold); cursor: pointer;">
        {detecting === 'entities' ? '⏳' : '🔍 Auto-detect'}
      </button>
    </div>
    <input bind:value={entitiesUrl} placeholder="https://api.company.com/entities" style={inputStyle} />
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-top: 6px;">
      <input bind:value={entitiesDataPath} placeholder="Data path (e.g. results)" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);" />
      <select bind:value={entitiesPaginationType} style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
        <option value="none">No pagination</option>
        <option value="offset">Offset + Limit</option>
        <option value="cursor">Cursor</option>
        <option value="link_header">Link Header</option>
      </select>
    </div>
    {#if entitiesPaginationType === 'offset'}
      <div style="margin-top: 6px;">
        <input type="number" bind:value={entitiesPaginationPageSize} placeholder="Page size" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100px;" />
        <span style="font-size: 9px; color: var(--text3); margin-left: 6px;">items per page</span>
      </div>
    {:else if entitiesPaginationType === 'cursor'}
      <div style="margin-top: 6px;">
        <input bind:value={entitiesPaginationCursorPath} placeholder="Cursor path (e.g. next_cursor)" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 200px;" />
        <span style="font-size: 9px; color: var(--text3); margin-left: 6px;">JSONPath to next cursor</span>
      </div>
    {/if}
    {#if entityApiFields.length > 0}
      <div style="margin-top: 12px;">
        <FieldMapper apiFields={entityApiFields} internalFields={entityInternalFields} bind:connections={entityConnections} sampleValues={entitySamples} />
      </div>
      <!-- Transforms for Entities -->
      {#each connectedEntityKeys() as internalKey}
        {@const apiField = Object.entries(entityConnections).find(([, k]) => k === internalKey)?.[0]}
        {@const sample = apiField ? entitySamples[apiField] : undefined}
        <TransformBuilder
          fieldKey={internalKey}
          source={apiField ?? ''}
          transforms={entityTransforms[internalKey] ?? []}
          sampleValue={sample}
          onchange={(steps) => updateEntityTransforms(internalKey, steps)}
        />
      {/each}
    {/if}
  </div>

  <!-- Endpoint: Accounts -->
  <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
      <span style="font-size: 14px;">🏦</span>
      <div style="font-size: 11px; font-weight: 600; color: var(--text); flex: 1;">Accounts</div>
      <button onclick={() => autoDetect('accounts')} disabled={!accountsUrl || detecting === 'accounts'} style="font-size: 9px; padding: 4px 10px; border: 1px solid var(--gold); border-radius: 4px; background: rgba(201,168,76,0.1); color: var(--gold); cursor: pointer;">
        {detecting === 'accounts' ? '⏳' : '🔍 Auto-detect'}
      </button>
    </div>
    <input bind:value={accountsUrl} placeholder="https://api.company.com/accounts" style={inputStyle} />
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-top: 6px;">
      <input bind:value={accountsDataPath} placeholder="Data path (e.g. results)" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);" />
      <select bind:value={accountsPaginationType} style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
        <option value="none">No pagination</option>
        <option value="offset">Offset + Limit</option>
        <option value="cursor">Cursor</option>
        <option value="link_header">Link Header</option>
      </select>
    </div>
    {#if accountsPaginationType === 'offset'}
      <div style="margin-top: 6px;">
        <input type="number" bind:value={accountsPaginationPageSize} placeholder="Page size" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100px;" />
        <span style="font-size: 9px; color: var(--text3); margin-left: 6px;">items per page</span>
      </div>
    {:else if accountsPaginationType === 'cursor'}
      <div style="margin-top: 6px;">
        <input bind:value={accountsPaginationCursorPath} placeholder="Cursor path (e.g. next_cursor)" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 200px;" />
        <span style="font-size: 9px; color: var(--text3); margin-left: 6px;">JSONPath to next cursor</span>
      </div>
    {/if}
    {#if accountApiFields.length > 0}
      <div style="margin-top: 12px;">
        <FieldMapper apiFields={accountApiFields} internalFields={accountInternalFields} bind:connections={accountConnections} sampleValues={accountSamples} />
      </div>
      <!-- Transforms for Accounts -->
      {#each connectedAccountKeys() as internalKey}
        {@const apiField = Object.entries(accountConnections).find(([, k]) => k === internalKey)?.[0]}
        {@const sample = apiField ? accountSamples[apiField] : undefined}
        <TransformBuilder
          fieldKey={internalKey}
          source={apiField ?? ''}
          transforms={accountTransforms[internalKey] ?? []}
          sampleValue={sample}
          onchange={(steps) => updateAccountTransforms(internalKey, steps)}
        />
      {/each}
    {/if}
  </div>

  <!-- Endpoint: Balances -->
  <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
      <span style="font-size: 14px;">💰</span>
      <div style="font-size: 11px; font-weight: 600; color: var(--text); flex: 1;">Balances</div>
      <button onclick={() => autoDetect('balances')} disabled={!(balancesUrl || accountsUrl) || detecting === 'balances'} style="font-size: 9px; padding: 4px 10px; border: 1px solid var(--gold); border-radius: 4px; background: rgba(201,168,76,0.1); color: var(--gold); cursor: pointer;">
        {detecting === 'balances' ? '⏳' : '🔍 Auto-detect'}
      </button>
    </div>
    <input bind:value={balancesUrl} placeholder="Leave empty to use Accounts URL" style={inputStyle} />
    {#if !balancesUrl && accountsUrl}
      <div style="font-size: 9px; color: var(--text-dim); margin-top: 4px;">↳ Sharing Accounts endpoint</div>
    {/if}
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 8px; margin-top: 6px;">
      <input bind:value={balancesDataPath} placeholder="Data path" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);" />
      <select bind:value={balancesPaginationType} style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text);">
        <option value="none">No pagination</option>
        <option value="offset">Offset + Limit</option>
        <option value="cursor">Cursor</option>
        <option value="link_header">Link Header</option>
      </select>
    </div>
    {#if balancesPaginationType === 'offset'}
      <div style="margin-top: 6px;">
        <input type="number" bind:value={balancesPaginationPageSize} placeholder="Page size" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100px;" />
        <span style="font-size: 9px; color: var(--text3); margin-left: 6px;">items per page</span>
      </div>
    {:else if balancesPaginationType === 'cursor'}
      <div style="margin-top: 6px;">
        <input bind:value={balancesPaginationCursorPath} placeholder="Cursor path (e.g. next_cursor)" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 200px;" />
        <span style="font-size: 9px; color: var(--text3); margin-left: 6px;">JSONPath to next cursor</span>
      </div>
    {/if}
    {#if balanceApiFields.length > 0}
      <div style="margin-top: 12px;">
        <FieldMapper apiFields={balanceApiFields} internalFields={balanceInternalFields} bind:connections={balanceConnections} sampleValues={balanceSamples} />
      </div>
      <!-- Transforms for Balances -->
      {#each connectedBalanceKeys() as internalKey}
        {@const apiField = Object.entries(balanceConnections).find(([, k]) => k === internalKey)?.[0]}
        {@const sample = apiField ? balanceSamples[apiField] : undefined}
        <TransformBuilder
          fieldKey={internalKey}
          source={apiField ?? ''}
          transforms={balanceTransforms[internalKey] ?? []}
          sampleValue={sample}
          onchange={(steps) => updateBalanceTransforms(internalKey, steps)}
        />
      {/each}
    {/if}
  </div>

  <!-- Settings -->
  <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
    <div style="font-size: 11px; font-weight: 600; color: var(--text); margin-bottom: 12px;">Settings</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div><label style={labelStyle}>Cache TTL (seconds)</label><input type="number" bind:value={cacheTtl} style={inputStyle} /></div>
      <div><label style={labelStyle}>Timeout (ms)</label><input type="number" bind:value={timeout} style={inputStyle} /></div>
    </div>
    <div class="mt-3">
      <label style={labelStyle}>Auto-refresh interval (minutes, 0 = off)</label>
      <input type="number" bind:value={refreshInterval} min="0" style={inputStyle} />
      <div style="font-size: 9px; color: var(--text-dim); margin-top: 3px;">Dashboard will auto-refresh every N minutes when enabled</div>
    </div>
  </div>

  <!-- Joins -->
  <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px;">
      <div style="font-size: 11px; font-weight: 600; color: var(--text); flex: 1;">🔗 Joins</div>
      <button onclick={() => { showJoinForm = !showJoinForm; }} style="font-size: 9px; padding: 4px 10px; border: 1px solid var(--gold); border-radius: 4px; background: rgba(201,168,76,0.1); color: var(--gold); cursor: pointer;">
        + Add join
      </button>
    </div>
    <div style="font-size: 9px; color: var(--text3); margin-bottom: 8px;">Define how accounts/balances link to entities (e.g. entityName → name, fuzzy match)</div>

    <!-- Add join form -->
    {#if showJoinForm}
      <div style="padding: 10px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 6px; margin-bottom: 10px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
          <div>
            <label style="display: block; font-size: 8px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px;">From field</label>
            <input bind:value={newJoin.fromField} placeholder="entityName" style="font-size: 10px; padding: 5px 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%;" />
          </div>
          <div>
            <label style="display: block; font-size: 8px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px;">To field</label>
            <input bind:value={newJoin.toField} placeholder="name" style="font-size: 10px; padding: 5px 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%;" />
          </div>
          <div>
            <label style="display: block; font-size: 8px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px;">Method</label>
            <select bind:value={newJoin.method} style="font-size: 10px; padding: 5px 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%;">
              <option value="exact">Exact</option>
              <option value="contains">Contains</option>
              <option value="fuzzy">Fuzzy</option>
            </select>
          </div>
        </div>
        {#if newJoin.method === 'fuzzy'}
          <div style="margin-bottom: 8px;">
            <label style="display: block; font-size: 8px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 3px;">Fuzzy threshold (0-1)</label>
            <input type="number" bind:value={newJoin.fuzzyThreshold} min="0" max="1" step="0.05" style="font-size: 10px; padding: 5px 8px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100px;" />
          </div>
        {/if}
        <div style="display: flex; gap: 6px;">
          <button onclick={addJoin} style="font-size: 9px; padding: 4px 10px; border: none; border-radius: 4px; background: var(--gold); color: #000; cursor: pointer; font-weight: 600;">Add</button>
          <button onclick={() => { showJoinForm = false; }} style="font-size: 9px; padding: 4px 10px; border: 1px solid var(--border); border-radius: 4px; background: transparent; color: var(--text3); cursor: pointer;">Cancel</button>
        </div>
      </div>
    {/if}

    <!-- Existing joins -->
    {#if joins.length === 0}
      <div style="font-size: 9px; color: var(--text3); text-align: center; padding: 8px 0;">No joins defined. Accounts will use entityName as-is.</div>
    {:else}
      {#each joins as join, i}
        <div style="display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 5px; margin-bottom: 4px;">
          <span style="font-size: 9px; color: var(--text3);">{join.fromField}</span>
          <span style="font-size: 9px; color: var(--gold);">→</span>
          <span style="font-size: 9px; color: var(--text3);">{join.toField}</span>
          <span style="font-size: 8px; padding: 1px 6px; border-radius: 10px; background: rgba(201,168,76,0.1); color: var(--gold); margin-left: auto;">{join.method}{join.method === 'fuzzy' ? ` (${join.fuzzyThreshold})` : ''}</span>
          <button onclick={() => removeJoin(i)} style="font-size: 8px; padding: 2px 6px; border: 1px solid rgba(255,77,106,0.3); border-radius: 3px; background: transparent; color: var(--red); cursor: pointer;">✕</button>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Actions -->
  <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
    <button onclick={testConnection} disabled={testing || !entitiesUrl} style="font-size: 10px; padding: 8px 16px; border: 1px solid var(--gold); border-radius: 6px; background: rgba(201,168,76,0.1); color: var(--gold); cursor: pointer;">
      {testing ? 'Testing...' : '⚡ Test'}
    </button>
    <button onclick={save} disabled={saving} style="font-size: 10px; padding: 8px 16px; border: none; border-radius: 6px; background: var(--gold); color: #000; cursor: pointer; font-weight: 600;">
      {saving ? 'Saving...' : '💾 Save'}
    </button>
    {#if saved}<span style="font-size: 10px; color: var(--green);">✓ Saved</span>{/if}

    <!-- Import / Export -->
    <button onclick={exportConfig} style="font-size: 10px; padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px; background: transparent; color: var(--text3); cursor: pointer;">
      📤 Export
    </button>
    <label style="font-size: 10px; padding: 8px 16px; border: 1px solid var(--border); border-radius: 6px; background: transparent; color: var(--text3); cursor: pointer;">
      📥 Import
      <input type="file" accept=".json" onchange={importConfig} style="display: none;" />
    </label>
  </div>

  {#if testResult}
    <div style="margin-top: 12px; padding: 12px; background: var(--bg-card); border: 1px solid {testResult.ok ? 'var(--green)' : 'var(--red)'}; border-radius: 6px;">
      <div style="font-size: 12px; font-weight: 600; color: {testResult.ok ? 'var(--green)' : 'var(--red)'};">
        {testResult.ok ? '✅' : '❌'} {testResult.message}
      </div>
      {#if testResult.ok}<div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Latency: {testResult.latencyMs}ms</div>{/if}
    </div>
  {/if}
</div>
