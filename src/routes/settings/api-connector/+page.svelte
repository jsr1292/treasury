<script lang="ts">
  import { onMount } from 'svelte';

  let { data } = $props();

  // Form state
  let mode = $state<'database' | 'api'>('api');
  let connectorName = $state('');
  
  // API endpoints
  let entitiesUrl = $state('');
  let accountsUrl = $state('');
  let balancesUrl = $state('');
  let balanceHistoryUrl = $state('');
  let fxRatesUrl = $state('');

  // Auth
  let authType = $state<'none' | 'bearer' | 'basic' | 'api-key'>('none');
  let authToken = $state('');
  let authUsername = $state('');
  let authPassword = $state('');
  let authHeaderName = $state('X-API-Key');
  let authApiKey = $state('');

  // Field mappings
  let entityFields = $state('id,name,type,currency');
  let accountFields = $state('id,entityId,name,type,currency');
  let balanceFields = $state('accountId,date,balance,currency');

  // Data paths
  let entitiesDataPath = $state('');
  let accountsDataPath = $state('');
  let balancesDataPath = $state('');

  // Cache & refresh
  let cacheTtl = $state(1800);
  let timeout = $state(15000);

  // State
  let saving = $state(false);
  let saved = $state(false);
  let testing = $state(false);
  let testResult = $state<{ ok: boolean; message: string; latencyMs: number } | null>(null);
  let error = $state('');

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
      balanceHistoryUrl = c.balanceHistory?.url || '';
      fxRatesUrl = c.fxRates?.url || '';

      entityFields = Object.keys(c.entities?.fields || {}).join(',');
      accountFields = Object.keys(c.accounts?.fields || {}).join(',');
      balanceFields = Object.keys(c.balances?.fields || {}).join(',');

      entitiesDataPath = c.entities?.dataPath || '';
      accountsDataPath = c.accounts?.dataPath || '';
      balancesDataPath = c.balances?.dataPath || '';
    }
  });

  function buildConfig() {
    const parseFields = (str: string) => {
      const fields: Record<string, string> = {};
      for (const f of str.split(',').map(s => s.trim()).filter(Boolean)) {
        // "ourField:theirField" or just "ourField" (same name)
        const [our, their] = f.includes(':') ? f.split(':') : [f, f];
        fields[our.trim()] = their.trim();
      }
      return fields;
    };

    const auth: any = { type: authType };
    if (authType === 'bearer') auth.token = authToken;
    if (authType === 'basic') { auth.username = authUsername; auth.password = authPassword; }
    if (authType === 'api-key') { auth.headerName = authHeaderName; auth.apiKey = authApiKey; }

    const config: any = {
      type: 'api',
      name: connectorName || 'API Connector',
      version: 1,
      auth,
      cacheTtl,
      timeout,
      entities: {
        url: entitiesUrl,
        fields: parseFields(entityFields),
        ...(entitiesDataPath ? { dataPath: entitiesDataPath } : {}),
      },
      accounts: {
        url: accountsUrl,
        fields: parseFields(accountFields),
        ...(accountsDataPath ? { dataPath: accountsDataPath } : {}),
      },
      balances: {
        url: balancesUrl,
        fields: parseFields(balanceFields),
        ...(balancesDataPath ? { dataPath: balancesDataPath } : {}),
      },
    };

    if (balanceHistoryUrl) {
      config.balanceHistory = {
        url: balanceHistoryUrl,
        fields: parseFields(balanceFields),
        accountIdParam: 'accountId',
      };
    }
    if (fxRatesUrl) {
      config.fxRates = { url: fxRatesUrl, fields: parseFields('from,to,rate,date') };
    }

    return config;
  }

  async function save() {
    saving = true;
    error = '';
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
    testing = true;
    testResult = null;
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

<div style="max-width: 640px; margin: 0 auto;">
  <a href="/settings" style="font-size: 10px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; margin-bottom: 16px;">
    ← Settings
  </a>

  <h1 style="font-family: 'Libre Baskerville', serif; font-size: 18px; color: var(--gold); margin-bottom: 4px;">🔌 API Connector</h1>
  <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 20px;">
    Connect to your company's JSON APIs. Provide one URL per data domain.
  </p>

  {#if error}
    <div style="padding: 10px 14px; background: rgba(255,77,106,0.1); border: 1px solid var(--red); border-radius: 6px; font-size: 11px; color: var(--red); margin-bottom: 16px;">
      {error}
    </div>
  {/if}

  <!-- General -->
  <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
    <div style="font-size: 11px; font-weight: 600; color: var(--text); margin-bottom: 12px;">General</div>
    <div style="margin-bottom: 10px;">
      <label style={labelStyle}>Connector name</label>
      <input bind:value={connectorName} placeholder="My Company API" style={inputStyle} />
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
      <div>
        <label style={labelStyle}>Cache TTL (seconds)</label>
        <input type="number" bind:value={cacheTtl} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Request timeout (ms)</label>
        <input type="number" bind:value={timeout} style={inputStyle} />
      </div>
    </div>
  </div>

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
      <div>
        <label style={labelStyle}>Token</label>
        <input type="password" bind:value={authToken} placeholder="eyJ..." style={inputStyle} />
      </div>
    {:else if authType === 'basic'}
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style={labelStyle}>Username</label>
          <input bind:value={authUsername} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Password</label>
          <input type="password" bind:value={authPassword} style={inputStyle} />
        </div>
      </div>
    {:else if authType === 'api-key'}
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style={labelStyle}>Header name</label>
          <input bind:value={authHeaderName} placeholder="X-API-Key" style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>API Key</label>
          <input type="password" bind:value={authApiKey} style={inputStyle} />
        </div>
      </div>
    {/if}
  </div>

  <!-- Endpoints -->
  <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
    <div style="font-size: 11px; font-weight: 600; color: var(--text); margin-bottom: 12px;">Endpoints</div>

    <div style="margin-bottom: 12px;">
      <label style={labelStyle}>🏢 Entities URL</label>
      <input bind:value={entitiesUrl} placeholder="https://api.company.com/entities" style={inputStyle} />
      <div style="margin-top: 4px;">
        <label style="...font-size: 8px; color: var(--text-dim);">Field mapping (comma-separated, use field:jsonField for different names)</label>
        <input bind:value={entityFields} placeholder="id,name:type,currency" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%; margin-top: 2px;" />
      </div>
      <div style="margin-top: 4px;">
        <label style="font-size: 8px; color: var(--text-dim);">JSON data path (e.g. data.items)</label>
        <input bind:value={entitiesDataPath} placeholder="data" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%; margin-top: 2px;" />
      </div>
    </div>

    <div style="margin-bottom: 12px;">
      <label style={labelStyle}>🏦 Accounts URL</label>
      <input bind:value={accountsUrl} placeholder="https://api.company.com/accounts" style={inputStyle} />
      <div style="margin-top: 4px;">
        <input bind:value={accountFields} placeholder="id,entityId,name:type,currency" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%;" />
      </div>
      <div style="margin-top: 4px;">
        <input bind:value={accountsDataPath} placeholder="data" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%;" />
      </div>
    </div>

    <div style="margin-bottom: 12px;">
      <label style={labelStyle}>💰 Balances URL</label>
      <input bind:value={balancesUrl} placeholder="https://api.company.com/balances" style={inputStyle} />
      <div style="margin-top: 4px;">
        <input bind:value={balanceFields} placeholder="accountId,date,balance,currency" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%;" />
      </div>
      <div style="margin-top: 4px;">
        <input bind:value={balancesDataPath} placeholder="data" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%;" />
      </div>
    </div>

    <div style="margin-bottom: 12px;">
      <label style={labelStyle}>📈 Balance History URL <span style="color: var(--text-dim); text-transform: none;">(optional, use {accountId})</span></label>
      <input bind:value={balanceHistoryUrl} placeholder="https://api.company.com/balances/{accountId}/history" style={inputStyle} />
    </div>

    <div>
      <label style={labelStyle}>💱 FX Rates URL <span style="color: var(--text-dim); text-transform: none;">(optional)</span></label>
      <input bind:value={fxRatesUrl} placeholder="https://api.company.com/fx-rates" style={inputStyle} />
    </div>
  </div>

  <!-- Actions -->
  <div style="display: flex; gap: 10px; align-items: center;">
    <button onclick={testConnection} disabled={testing || !entitiesUrl} style="font-size: 10px; padding: 8px 16px; border: 1px solid var(--gold); border-radius: 6px; background: rgba(201,168,76,0.1); color: var(--gold); cursor: pointer;">
      {testing ? 'Testing...' : '⚡ Test Connection'}
    </button>
    <button onclick={save} disabled={saving} class="btn-primary" style="font-size: 10px; padding: 8px 16px;">
      {saving ? 'Saving...' : '💾 Save Connector'}
    </button>
    {#if saved}
      <span style="font-size: 10px; color: var(--green);">✓ Saved</span>
    {/if}
  </div>

  {#if testResult}
    <div style="margin-top: 12px; padding: 12px; background: var(--bg-card); border: 1px solid {testResult.ok ? 'var(--green)' : 'var(--red)'}; border-radius: 6px;">
      <div style="font-size: 12px; font-weight: 600; color: {testResult.ok ? 'var(--green)' : 'var(--red)'};">
        {testResult.ok ? '✅' : '❌'} {testResult.message}
      </div>
      {#if testResult.ok}
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Latency: {testResult.latencyMs}ms</div>
      {/if}
    </div>
  {/if}
</div>
