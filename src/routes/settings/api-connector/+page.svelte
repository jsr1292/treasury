<script lang="ts">
  import { onMount } from 'svelte';
  import FieldMapper from '$lib/components/FieldMapper.svelte';

  let { data } = $props();

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

  // Visual mapper connections: { apiField: internalKey }
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

  // Extra
  let connectorName = $state('');
  let cacheTtl = $state(1800);
  let timeout = $state(15000);

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
    if (data.connector && data.connector.type === 'api') {
      const c = data.connector;
      connectorName = c.name || '';
      authType = c.auth?.type || 'none';
      authToken = c.auth?.token || '';
      authUsername = c.auth?.username || '';
      authPassword = c.auth?.password || '';
      authHeaderName = c.auth?.headerName || 'X-API-Key';
      authApiKey = c.auth?.apiKey || '';
      cacheTtl = c.cacheTtl || 1800;
      timeout = c.timeout || 15000;
      entitiesUrl = c.entities?.url || '';
      accountsUrl = c.accounts?.url || '';
      balancesUrl = c.balances?.url || '';
      entitiesDataPath = c.entities?.dataPath || '';
      accountsDataPath = c.accounts?.dataPath || '';
      balancesDataPath = c.balances?.dataPath || '';
      // Reverse connections from { our: their } to { their: our } for the mapper
      entityConnections = reverseMap(c.entities?.fields);
      accountConnections = reverseMap(c.accounts?.fields);
      balanceConnections = reverseMap(c.balances?.fields);
    }
  });

  // fields stored as { ourField: theirField } but mapper uses { theirField: ourField }
  function reverseMap(fields: Record<string, string>): Record<string, string> {
    if (!fields) return {};
    const reversed: Record<string, string> = {};
    for (const [our, their] of Object.entries(fields)) {
      reversed[their] = our;
    }
    return reversed;
  }

  // Convert mapper connections back to { ourField: theirField } for saving
  function connectionsToFields(conns: Record<string, string>): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const [apiField, internalKey] of Object.entries(conns)) {
      fields[internalKey] = apiField;
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
        // Store the detected API fields and sample values
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

        // Auto-apply detected mappings
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

  function buildConfig() {
    return {
      type: 'api',
      name: connectorName || 'API Connector',
      version: 1,
      auth: getAuthPayload(),
      cacheTtl,
      timeout,
      entities: { url: entitiesUrl, fields: connectionsToFields(entityConnections), ...(entitiesDataPath ? { dataPath: entitiesDataPath } : {}) },
      accounts: { url: accountsUrl, fields: connectionsToFields(accountConnections), ...(accountsDataPath ? { dataPath: accountsDataPath } : {}) },
      balances: { url: balancesUrl, fields: connectionsToFields(balanceConnections), ...(balancesDataPath ? { dataPath: balancesDataPath } : {}) },
    };
  }

  async function save() {
    saving = true; error = '';
    try {
      const res = await fetch('/api/connector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildConfig()),
      });
      if (res.ok) { saved = true; setTimeout(() => saved = false, 2000); }
      else { const d = await res.json(); error = d.error || 'Save failed'; }
    } catch (e: any) { error = e.message; }
    saving = false;
  }

  async function testConnection() {
    testing = true; testResult = null;
    try {
      const res = await fetch('/api/connector/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildConfig()),
      });
      testResult = await res.json();
    } catch (e: any) {
      testResult = { ok: false, message: e.message, latencyMs: 0 };
    }
    testing = false;
  }

  const inputStyle = 'width: 100%; font-size: 12px; padding: 8px 10px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text);';
  const labelStyle = 'display: block; font-size: 9px; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px;';
</script>

<div style="max-width: 720px; margin: 0 auto;">
  <a href="/settings" style="font-size: 10px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; margin-bottom: 16px;">← Settings</a>

  <h1 style="font-family: 'Libre Baskerville', serif; font-size: 18px; color: var(--gold); margin-bottom: 4px;">🔌 API Connector</h1>
  <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 20px;">
    Enter your API URL, click <strong>Auto-detect</strong>, then connect fields visually.
  </p>

  {#if error}
    <div style="padding: 10px 14px; background: rgba(255,77,106,0.1); border: 1px solid var(--red); border-radius: 6px; font-size: 11px; color: var(--red); margin-bottom: 16px;">{error}</div>
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
    </div>
    {#if entityApiFields.length > 0}
      <div style="margin-top: 12px;">
        <FieldMapper apiFields={entityApiFields} internalFields={entityInternalFields} bind:connections={entityConnections} sampleValues={entitySamples} />
      </div>
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
    <div style="margin-top: 6px;">
      <input bind:value={accountsDataPath} placeholder="Data path (e.g. results)" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%;" />
    </div>
    {#if accountApiFields.length > 0}
      <div style="margin-top: 12px;">
        <FieldMapper apiFields={accountApiFields} internalFields={accountInternalFields} bind:connections={accountConnections} sampleValues={accountSamples} />
      </div>
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
    <div style="margin-top: 6px;">
      <input bind:value={balancesDataPath} placeholder="Data path" style="font-size: 10px; padding: 5px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%;" />
    </div>
    {#if balanceApiFields.length > 0}
      <div style="margin-top: 12px;">
        <FieldMapper apiFields={balanceApiFields} internalFields={balanceInternalFields} bind:connections={balanceConnections} sampleValues={balanceSamples} />
      </div>
    {/if}
  </div>

  <!-- Settings -->
  <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
    <div style="font-size: 11px; font-weight: 600; color: var(--text); margin-bottom: 12px;">Settings</div>
    <div style="margin-bottom: 10px;">
      <label style={labelStyle}>Connector name</label>
      <input bind:value={connectorName} placeholder="My Company API" style={inputStyle} />
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div><label style={labelStyle}>Cache TTL (seconds)</label><input type="number" bind:value={cacheTtl} style={inputStyle} /></div>
      <div><label style={labelStyle}>Timeout (ms)</label><input type="number" bind:value={timeout} style={inputStyle} /></div>
    </div>
  </div>

  <!-- Actions -->
  <div style="display: flex; gap: 10px; align-items: center;">
    <button onclick={testConnection} disabled={testing || !entitiesUrl} style="font-size: 10px; padding: 8px 16px; border: 1px solid var(--gold); border-radius: 6px; background: rgba(201,168,76,0.1); color: var(--gold); cursor: pointer;">
      {testing ? 'Testing...' : '⚡ Test'}
    </button>
    <button onclick={save} disabled={saving} style="font-size: 10px; padding: 8px 16px; border: none; border-radius: 6px; background: var(--gold); color: #000; cursor: pointer; font-weight: 600;">
      {saving ? 'Saving...' : '💾 Save'}
    </button>
    {#if saved}<span style="font-size: 10px; color: var(--green);">✓ Saved</span>{/if}
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
