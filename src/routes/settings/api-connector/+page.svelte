<script lang="ts">
  import { onMount } from 'svelte';

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

  // Data paths (auto-detected)
  let entitiesDataPath = $state('');
  let accountsDataPath = $state('');
  let balancesDataPath = $state('');

  // Field mappings (auto-detected, comma-separated: ourField:theirField)
  let entityFields = $state('');
  let accountFields = $state('');
  let balanceFields = $state('');

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
  let detectResults = $state<Record<string, any>>({});

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
      entityFields = fieldsToStr(c.entities?.fields);
      accountFields = fieldsToStr(c.accounts?.fields);
      balanceFields = fieldsToStr(c.balances?.fields);
    }
  });

  function fieldsToStr(fields: Record<string, string>): string {
    if (!fields) return '';
    return Object.entries(fields)
      .map(([our, their]) => our === their ? our : `${our}:${their}`)
      .join(', ');
  }

  function getAuthHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (authType === 'bearer') h['Authorization'] = `Bearer ${authToken}`;
    else if (authType === 'basic') h['Authorization'] = `Basic ${btoa(`${authUsername}:${authPassword}`)}`;
    else if (authType === 'api-key') h[authHeaderName] = authApiKey;
    return h;
  }

  async function autoDetect(endpoint: 'entities' | 'accounts' | 'balances') {
    const urls = { entities: entitiesUrl, accounts: accountsUrl, balances: balancesUrl || accountsUrl };
    const url = urls[endpoint];
    if (!url) return;

    detecting = endpoint;
    try {
      const res = await fetch('/api/connector/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, auth: getAuthPayload(), dataPath: endpoint === 'entities' ? entitiesDataPath : endpoint === 'accounts' ? accountsDataPath : balancesDataPath }),
      });
      const result = await res.json();
      detectResults[endpoint] = result;

      if (result.error) {
        error = result.error;
      } else {
        // Apply detected mappings
        const d = result.detected;
        const path = endpoint;
        
        if (endpoint === 'entities') {
          const pairs = [];
          if (d.id) pairs.push(`id:${d.id}`);
          if (d.name) pairs.push(`name:${d.name}`);
          if (d.type) pairs.push(`type:${d.type}`);
          if (d.currency) pairs.push(`currency:${d.currency}`);
          if (d.parentId) pairs.push(`parentId:${d.parentId}`);
          if (d.country) pairs.push(`country:${d.country}`);
          entityFields = pairs.join(', ');
          if (result.suggestedDataPath) entitiesDataPath = result.suggestedDataPath;
        } else if (endpoint === 'accounts') {
          const pairs = [];
          if (d.id || d.accountName) pairs.push(`id:${d.id || d.accountName}`);
          if (d.name || d.accountName) pairs.push(`name:${d.name || d.accountName}`);
          if (d.entityId || d.parentName) pairs.push(`entityName:${d.entityId || d.parentName}`);
          if (d.type || d.accountType) pairs.push(`type:${d.type || d.accountType}`);
          if (d.currency) pairs.push(`currency:${d.currency}`);
          if (d.bankName) pairs.push(`bankName:${d.bankName}`);
          accountFields = pairs.join(', ');
          if (result.suggestedDataPath) accountsDataPath = result.suggestedDataPath;
        } else {
          const pairs = [];
          if (d.accountId || d.accountName) pairs.push(`accountId:${d.accountId || d.accountName}`);
          if (d.entityId) pairs.push(`entityId:${d.entityId}`);
          if (d.date || d.registeredDate) pairs.push(`date:${d.date || d.registeredDate}`);
          if (d.balance || d.balanceEur) pairs.push(`balance:${d.balance || d.balanceEur}`);
          if (d.balanceLocal) pairs.push(`balanceLocal:${d.balanceLocal}`);
          if (d.currency) pairs.push(`currency:${d.currency}`);
          balanceFields = pairs.join(', ');
          if (result.suggestedDataPath) balancesDataPath = result.suggestedDataPath;
        }
        error = '';
      }
    } catch (e: any) {
      error = e.message;
    }
    detecting = '';
  }

  function getAuthPayload() {
    const auth: any = { type: authType };
    if (authType === 'bearer') auth.token = authToken;
    if (authType === 'basic') { auth.username = authUsername; auth.password = authPassword; }
    if (authType === 'api-key') { auth.headerName = authHeaderName; auth.apiKey = authApiKey; }
    return auth;
  }

  function parseFields(str: string): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const f of str.split(',').map(s => s.trim()).filter(Boolean)) {
      const [our, their] = f.includes(':') ? f.split(':') : [f, f];
      fields[our.trim()] = their.trim();
    }
    return fields;
  }

  function buildConfig() {
    return {
      type: 'api',
      name: connectorName || 'API Connector',
      version: 1,
      auth: getAuthPayload(),
      cacheTtl,
      timeout,
      entities: { url: entitiesUrl, fields: parseFields(entityFields), ...(entitiesDataPath ? { dataPath: entitiesDataPath } : {}) },
      accounts: { url: accountsUrl, fields: parseFields(accountFields), ...(accountsDataPath ? { dataPath: accountsDataPath } : {}) },
      balances: { url: balancesUrl, fields: parseFields(balanceFields), ...(balancesDataPath ? { dataPath: balancesDataPath } : {}) },
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

<div style="max-width: 640px; margin: 0 auto;">
  <a href="/settings" style="font-size: 10px; color: var(--text-muted); display: inline-flex; align-items: center; gap: 4px; margin-bottom: 16px;">← Settings</a>

  <h1 style="font-family: 'Libre Baskerville', serif; font-size: 18px; color: var(--gold); margin-bottom: 4px;">🔌 API Connector</h1>
  <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 20px;">
    Enter your API URLs and click <strong>Auto-detect</strong> — we'll figure out the field mappings.
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

  <!-- Endpoints with auto-detect -->
  <div class="glass-card" style="padding: 16px; margin-bottom: 12px;">
    <div style="font-size: 11px; font-weight: 600; color: var(--text); margin-bottom: 12px;">Endpoints</div>

    <!-- Entities -->
    <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border);">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="font-size: 14px;">🏢</span>
        <label style="...margin-bottom: 0; flex: 1;">Entities URL</label>
        <button onclick={() => autoDetect('entities')} disabled={!entitiesUrl || detecting === 'entities'} style="font-size: 9px; padding: 4px 10px; border: 1px solid var(--gold); border-radius: 4px; background: rgba(201,168,76,0.1); color: var(--gold); cursor: pointer; white-space: nowrap;">
          {detecting === 'entities' ? 'Detecting...' : '🔍 Auto-detect'}
        </button>
      </div>
      <input bind:value={entitiesUrl} placeholder="https://api.company.com/entities" style={inputStyle} />
      {#if detectResults.entities?.keys}
        <div style="font-size: 9px; color: var(--green); margin-top: 4px;">✓ {detectResults.entities.itemCount} records, {detectResults.entities.keys.length} fields detected</div>
        <details style="margin-top: 4px;">
          <summary style="font-size: 9px; color: var(--text-dim); cursor: pointer;">Preview first record</summary>
          <pre style="font-size: 9px; color: var(--text-muted); background: var(--bg-surface); padding: 8px; border-radius: 4px; overflow-x: auto; margin-top: 4px; white-space: pre-wrap;">{JSON.stringify(detectResults.entities.sample, null, 2)}</pre>
        </details>
      {/if}
      <details style="margin-top: 6px;">
        <summary style="font-size: 9px; color: var(--text-dim); cursor: pointer;">Field mapping (auto-detected — edit if needed)</summary>
        <input bind:value={entityFields} placeholder="id, name, type, currency" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%; margin-top: 4px;" />
        <input bind:value={entitiesDataPath} placeholder="JSON path (e.g. data.items)" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%; margin-top: 4px;" />
      </details>
    </div>

    <!-- Accounts -->
    <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border);">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="font-size: 14px;">🏦</span>
        <label style="...margin-bottom: 0; flex: 1;">Accounts URL</label>
        <button onclick={() => autoDetect('accounts')} disabled={!accountsUrl || detecting === 'accounts'} style="font-size: 9px; padding: 4px 10px; border: 1px solid var(--gold); border-radius: 4px; background: rgba(201,168,76,0.1); color: var(--gold); cursor: pointer; white-space: nowrap;">
          {detecting === 'accounts' ? 'Detecting...' : '🔍 Auto-detect'}
        </button>
      </div>
      <input bind:value={accountsUrl} placeholder="https://api.company.com/accounts" style={inputStyle} />
      {#if detectResults.accounts?.keys}
        <div style="font-size: 9px; color: var(--green); margin-top: 4px;">✓ {detectResults.accounts.itemCount} records, {detectResults.accounts.keys.length} fields detected</div>
        <details style="margin-top: 4px;">
          <summary style="font-size: 9px; color: var(--text-dim); cursor: pointer;">Preview first record</summary>
          <pre style="font-size: 9px; color: var(--text-muted); background: var(--bg-surface); padding: 8px; border-radius: 4px; overflow-x: auto; margin-top: 4px; white-space: pre-wrap;">{JSON.stringify(detectResults.accounts.sample, null, 2)}</pre>
        </details>
      {/if}
      <details style="margin-top: 6px;">
        <summary style="font-size: 9px; color: var(--text-dim); cursor: pointer;">Field mapping</summary>
        <input bind:value={accountFields} placeholder="id, entityId, name, type, currency" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%; margin-top: 4px;" />
        <input bind:value={accountsDataPath} placeholder="JSON path" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%; margin-top: 4px;" />
      </details>
    </div>

    <!-- Balances -->
    <div>
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="font-size: 14px;">💰</span>
        <label style="...margin-bottom: 0; flex: 1;">Balances URL</label>
        <button onclick={() => autoDetect('balances')} disabled={!(balancesUrl || accountsUrl) || detecting === 'balances'} style="font-size: 9px; padding: 4px 10px; border: 1px solid var(--gold); border-radius: 4px; background: rgba(201,168,76,0.1); color: var(--gold); cursor: pointer; white-space: nowrap;">
          {detecting === 'balances' ? 'Detecting...' : '🔍 Auto-detect'}
        </button>
      </div>
      <input bind:value={balancesUrl} placeholder="Leave empty to use Accounts URL" style={inputStyle} />
      {#if !balancesUrl && accountsUrl}
        <div style="font-size: 9px; color: var(--text-dim); margin-top: 4px;">↳ Sharing Accounts endpoint — map balance fields below</div>
      {/if}
      {#if detectResults.balances?.keys}
        <div style="font-size: 9px; color: var(--green); margin-top: 4px;">✓ {detectResults.balances.itemCount} records, {detectResults.balances.keys.length} fields detected</div>
        <details style="margin-top: 4px;">
          <summary style="font-size: 9px; color: var(--text-dim); cursor: pointer;">Preview first record</summary>
          <pre style="font-size: 9px; color: var(--text-muted); background: var(--bg-surface); padding: 8px; border-radius: 4px; overflow-x: auto; margin-top: 4px; white-space: pre-wrap;">{JSON.stringify(detectResults.balances.sample, null, 2)}</pre>
        </details>
      {/if}
      <details style="margin-top: 6px;">
        <summary style="font-size: 9px; color: var(--text-dim); cursor: pointer;">Field mapping</summary>
        <input bind:value={balanceFields} placeholder="accountId, date, balance, currency" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%; margin-top: 4px;" />
        <input bind:value={balancesDataPath} placeholder="JSON path" style="font-size: 10px; padding: 6px 8px; background: var(--bg-surface); border: 1px solid var(--border); border-radius: 4px; color: var(--text); width: 100%; margin-top: 4px;" />
      </details>
    </div>
  </div>

  <!-- General settings -->
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
    <button onclick={save} disabled={saving} class="btn-primary" style="font-size: 10px; padding: 8px 16px;">
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
