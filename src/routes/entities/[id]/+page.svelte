<script>
  import { formatNumber, formatCurrency } from '$lib/format';
  import { CURRENCIES, ACCOUNT_TYPES } from '$lib/constants';
  let { data } = $props();
  let entity = $derived(data.entity);
  let children = $derived(data.children || []);
  let accounts = $derived(data.accounts || []);
  let connectorMode = $derived(data.connectorMode || 'database');
  let isApiMode = $derived(connectorMode === 'api');

  let showAddAccount = $state(false);
  let acctName = $state('');
  let acctType = $state('bank');
  let acctCurrency = $state('EUR');
  $effect(() => { if (entity?.currency) acctCurrency = entity.currency; });
  let acctBankName = $state('');
  let acctAccountNumber = $state('');
  let acctMaturity = $state('');
  let acctRate = $state('');
  let submitting = $state(false);

  let balanceAccountId = $state('');
  let balanceDate = $state(new Date().toISOString().split('T')[0]);
  let balanceAmount = $state('');
  let balanceNotes = $state('');
  let showBalanceForm = $state(false);
  let balanceSubmitting = $state(false);

  async function handleAddAccount(e) {
    e.preventDefault();
    submitting = true;
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityId: entity.id, name: acctName, type: acctType, currency: acctCurrency,
        bankName: acctBankName, accountNumber: acctAccountNumber,
        maturityDate: acctMaturity || undefined, interestRate: acctRate || undefined,
      }),
    });
    if (res.ok) {
      const account = await res.json();
      accounts = [...accounts, account];
      acctName = ''; acctBankName = ''; acctAccountNumber = ''; acctMaturity = ''; acctRate = '';
      showAddAccount = false;
      window.__toast?.('Account created');
    } else {
      window.__toast?.('Failed to create account', 'error');
    }
    submitting = false;
  }

  async function handleBalance(e) {
    e.preventDefault();
    balanceSubmitting = true;
    const res = await fetch('/api/balances', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: balanceAccountId, date: balanceDate, balance: balanceAmount,
        currency: acctCurrency, notes: balanceNotes,
      }),
    });
    if (res.ok) {
      const result = await res.json();
      balanceAmount = ''; balanceNotes = '';
      showBalanceForm = false;
      if (result.anomaly) {
        window.__toast?.('Balance saved — anomaly flagged ⚠️', 'warning');
      } else {
        window.__toast?.('Balance entry saved');
      }
      setTimeout(() => window.location.reload(), 800);
    } else {
      window.__toast?.('Failed to save balance', 'error');
    }
    balanceSubmitting = false;
  }

  function startBalance(accountId) {
    balanceAccountId = accountId;
    showBalanceForm = true;
  }

  function getAccountHref(account) {
    return '/accounts/' + (account.id || account.name || '');
  }

  function getEntityHref(entity) {
    return '/entities/' + (entity.id || entity.name || '');
  }
</script>

<svelte:head>
  <title>{entity?.name || 'Entity'} — Treasury</title>
</svelte:head>

<div class="max-w-5xl mx-auto page-desktop">
  {#if entity}
    <a href="/entities" class="text-xs no-underline" style="color: var(--text3); letter-spacing: 0.1em;">← ENTITIES</a>

    <div class="mt-3 mb-6">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm">{entity.type === 'headquarters' ? '🏢' : entity.type === 'branch' ? '📍' : '🏗️'}</span>
        <span class="badge {entity.type === 'headquarters' ? 'badge-gold' : entity.type === 'branch' ? 'badge-blue' : 'badge-green'}">{entity.type === 'headquarters' ? 'Headquarters' : entity.type === 'branch' ? 'Branch' : entity.type === 'subsidiary' ? 'Subsidiary' : (entity.type || 'Entity')}</span>
      </div>
      <h1 class="text-xl font-bold" style="color: var(--text);">{entity.name || '—'}</h1>
      <div class="text-xs mt-1" style="color: var(--text3);">
        {entity.currency || '—'}{#if entity.country} · {entity.country}{/if}{#if entity.taxId} · {entity.taxId}{/if}
      </div>
    </div>

    {#if children.length > 0}
      <div class="mb-6">
        <div class="text-[10px] font-semibold uppercase tracking-[0.1em] mb-3" style="color: var(--text3);">Structure ({children.length})</div>
        <div class="space-y-2">
          {#each children as child}
            <a href={getEntityHref(child)} class="account-row block no-underline">
              <span>{child.type === 'branch' ? '📍' : child.type === 'subsidiary' ? '🏗️' : '🏢'}</span>
              <div class="flex-1">
                <div class="text-sm font-semibold" style="color: var(--text);">{child.name || '—'}</div>
                <div class="text-[10px]" style="color: var(--text3);">{(child.type || 'entity').toUpperCase()} · {child.currency || '—'}</div>
              </div>
              <span class="text-xs" style="color: var(--gold);">→</span>
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <div class="text-[10px] font-semibold uppercase tracking-[0.1em]" style="color: var(--text3);">Accounts ({accounts.length})</div>
        {#if !isApiMode}
          <button onclick={() => showAddAccount = !showAddAccount}
            class="text-[10px] font-bold tracking-[0.1em] px-3 py-1.5 rounded-lg"
            style="color: var(--gold); background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.2);">
            {showAddAccount ? 'CANCEL' : '+ ADD'}
          </button>
        {/if}
      </div>

      {#if showAddAccount && !isApiMode}
        <div class="stat-card mb-4" style="border: 1px solid rgba(201,168,76,0.2);">
          <div class="text-xs font-semibold mb-4" style="color: var(--gold); letter-spacing: 0.1em;">NEW ACCOUNT</div>
          <form onsubmit={handleAddAccount} class="space-y-3">
            <div>
              <label class="label" for="aname">Account Name</label>
              <input id="aname" type="text" bind:value={acctName} placeholder="Banco Santander - Cuenta Operativa" required class="input" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label" for="atype">Type</label>
                <select id="atype" bind:value={acctType} class="input">
                  {#each Object.entries(ACCOUNT_TYPES) as [key, cfg]}
                    <option value={key}>{cfg.icon} {cfg.label}</option>
                  {/each}
                </select>
              </div>
              <div>
                <label class="label" for="acur">Currency</label>
                <select id="acur" bind:value={acctCurrency} class="input">
                  {#each CURRENCIES as cur}
                    <option value={cur}>{cur}</option>
                  {/each}
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label" for="abank">Bank Name</label>
                <input id="abank" type="text" bind:value={acctBankName} placeholder="Banco Santander" class="input" />
              </div>
              <div>
                <label class="label" for="anum">IBAN / Account Number</label>
                <input id="anum" type="text" bind:value={acctAccountNumber} placeholder="ES12 3456..." class="input" />
              </div>
            </div>
            {#if acctType === 'deposit' || acctType === 'bond'}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label" for="amat">Maturity Date</label>
                  <input id="amat" type="date" bind:value={acctMaturity} class="input" />
                </div>
                <div>
                  <label class="label" for="arate">Interest Rate (%)</label>
                  <input id="arate" type="text" bind:value={acctRate} placeholder="3.50" class="input mono" />
                </div>
              </div>
            {/if}
            <button type="submit" disabled={submitting || !acctName.trim()}
              class="w-full py-3 rounded-lg text-xs font-bold btn-gold disabled:opacity-40">
              {submitting ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>
      {/if}

      {#if showBalanceForm}
        <div class="stat-card mb-4" style="border: 1px solid rgba(201,168,76,0.3);">
          <div class="text-xs font-bold mb-3" style="color: var(--gold); letter-spacing: 0.1em;">ENTER BALANCE</div>
          <form onsubmit={handleBalance} class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label" for="bdate">Date</label>
                <input id="bdate" type="date" bind:value={balanceDate} required class="input" />
              </div>
              <div>
                <label class="label" for="bamt">Balance ({acctCurrency})</label>
                <input id="bamt" type="text" bind:value={balanceAmount} placeholder="15000,00" required class="input mono" />
              </div>
            </div>
            <div>
              <label class="label" for="bnotes">Notes</label>
              <input id="bnotes" type="text" bind:value={balanceNotes} placeholder="End of month balance" class="input" />
            </div>
            <div class="flex gap-2">
              <button type="submit" disabled={balanceSubmitting}
                class="flex-1 py-3 rounded-lg text-xs font-bold btn-gold disabled:opacity-40">
                {balanceSubmitting ? 'Saving...' : 'Save Balance'}
              </button>
              <button type="button" onclick={() => showBalanceForm = false}
                class="px-4 py-3 rounded-lg text-xs" style="color: var(--text3); background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border);">
                Cancel
              </button>
            </div>
          </form>
        </div>
      {/if}

      {#if accounts.length > 0}
        <!-- Desktop table -->
        <div class="stat-card hidden md:block" style="padding: 0; overflow: hidden;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Bank</th>
                <th>Currency</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              {#each accounts as account}
                {@const cfg = ACCOUNT_TYPES[account.type] || ACCOUNT_TYPES.other}
                <tr>
                  <td><a href={getAccountHref(account)} class="no-underline" style="color: var(--text); font-weight: 500;">{account.name || '—'}</a></td>
                  <td><span class="badge {cfg.badge}">{cfg.icon} {cfg.label}</span></td>
                  <td style="color: var(--text3);">{account.bankName || '—'}</td>
                  <td class="mono" style="color: var(--text3);">{account.currency || '—'}</td>
                  <td style="text-align: right;">
                    {#if !isApiMode}
                      <button onclick={() => startBalance(account.id || account.name)}
                        class="text-[10px] font-bold px-3 py-1.5 rounded"
                        style="color: var(--gold); background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.15); cursor: pointer;">
                        + Balance
                      </button>
                    {:else}
                      <a href={getAccountHref(account)}
                        class="text-[10px] font-bold px-3 py-1.5 rounded"
                        style="color: var(--gold); background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.15); text-decoration: none;">
                        View →
                      </a>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>

        <!-- Mobile cards -->
        <div class="md:hidden space-y-2">
          {#each accounts as account}
            {@const cfg = ACCOUNT_TYPES[account.type] || ACCOUNT_TYPES.other}
            <div class="account-row">
              <div class="text-base">{cfg.icon}</div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold truncate" style="color: var(--text);">{account.name || '—'}</div>
                <div class="text-[10px]" style="color: var(--text3);">
                  <span class="badge {cfg.badge}" style="font-size: 9px;">{cfg.label}</span>
                  {#if account.bankName} · {account.bankName}{/if}
                </div>
              </div>
              {#if !isApiMode}
                <button onclick={() => startBalance(account.id || account.name)}
                  class="text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                  style="color: var(--gold); background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.15); cursor: pointer;">
                  + BAL
                </button>
              {:else}
                <a href={getAccountHref(account)}
                  class="text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                  style="color: var(--gold); background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.15); text-decoration: none;">
                  →
                </a>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="stat-card text-center py-8">
          <div style="color: var(--text3); font-size: 12px;">
            {isApiMode ? 'No accounts mapped to this entity in the API data.' : 'No accounts yet. Click "+ ADD" to create one.'}
          </div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="stat-card text-center py-12">
      <div style="color: var(--text3);">Entity not found</div>
    </div>
  {/if}
</div>
