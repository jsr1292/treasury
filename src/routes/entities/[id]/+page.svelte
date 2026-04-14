<script>
  let { data } = $props();
  let entity = $derived(data.entity);
  let children = $derived(data.children || []);
  let accounts = $derived(data.accounts || []);

  // Add account form
  let showAddAccount = $state(false);
  let acctName = $state('');
  let acctType = $state('bank');
  let acctCurrency = $state('EUR');
  $effect(() => { if (entity?.currency) acctCurrency = entity.currency; })
  let acctBankName = $state('');
  let acctAccountNumber = $state('');
  let acctMaturity = $state('');
  let acctRate = $state('');
  let submitting = $state(false);

  // Balance entry form
  let balanceAccountId = $state('');
  let balanceDate = $state(new Date().toISOString().split('T')[0]);
  let balanceAmount = $state('');
  let balanceNotes = $state('');
  let showBalanceForm = $state(false);
  let balanceSubmitting = $state(false);

  function fmt(n) {
    if (!n) return '—';
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(n));
  }

  async function handleAddAccount(e) {
    e.preventDefault();
    submitting = true;
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityId: entity.id,
        name: acctName,
        type: acctType,
        currency: acctCurrency,
        bankName: acctBankName,
        accountNumber: acctAccountNumber,
        maturityDate: acctMaturity || undefined,
        interestRate: acctRate || undefined,
      }),
    });
    if (res.ok) {
      const account = await res.json();
      accounts = [...accounts, account];
      acctName = ''; acctBankName = ''; acctAccountNumber = ''; acctMaturity = ''; acctRate = '';
      showAddAccount = false;
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
        accountId: balanceAccountId,
        date: balanceDate,
        balance: balanceAmount,
        currency: acctCurrency,
        notes: balanceNotes,
      }),
    });
    if (res.ok) {
      const entry = await res.json();
      // Update the account's latest balance in the list
      accounts = accounts.map(a => a.id === balanceAccountId ? { ...a, latestBalance: entry } : a);
      balanceAmount = ''; balanceNotes = '';
      showBalanceForm = false;
    }
    balanceSubmitting = false;
  }

  function startBalance(accountId) {
    balanceAccountId = accountId;
    showBalanceForm = true;
  }
</script>

<svelte:head>
  <title>{entity?.name || 'Entity'} — Treasury</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-6">
  {#if entity}
    <a href="/entities" class="text-xs" style="color: var(--text3); letter-spacing: 0.1em;">← ENTITIES</a>

    <!-- Header -->
    <div class="mt-3 mb-6">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-sm">{entity.type === 'headquarters' ? '🏢' : entity.type === 'branch' ? '📍' : '🏗️'}</span>
        <span class="text-[10px] uppercase font-bold tracking-[0.12em]" style="color: {entity.type === 'headquarters' ? 'var(--gold)' : entity.type === 'branch' ? 'var(--green)' : 'var(--blue)'};">
          {entity.type}
        </span>
      </div>
      <h1 class="text-2xl font-bold" style="color: var(--text);">{entity.name}</h1>
      <div class="text-xs mt-1" style="color: var(--text3);">
        {entity.currency}
        {#if entity.country} · {entity.country}{/if}
        {#if entity.taxId} · {entity.taxId}{/if}
      </div>
    </div>

    <!-- Children entities -->
    {#if children.length > 0}
      <div class="mb-6">
        <div class="text-[10px] font-bold uppercase tracking-[0.12em] mb-3" style="color: var(--text3);">Structure</div>
        <div class="space-y-2">
          {#each children as child}
            <a href="/entities/{child.id}" class="account-row block no-underline">
              <div class="text-sm">{child.type === 'branch' ? '📍' : '🏗️'}</div>
              <div class="flex-1">
                <div class="text-sm font-semibold" style="color: var(--text);">{child.name}</div>
                <div class="text-[10px]" style="color: var(--text3);">{child.type.toUpperCase()} · {child.currency}</div>
              </div>
              <span class="text-xs" style="color: var(--gold);">→</span>
            </a>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Accounts -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-3">
        <div class="text-[10px] font-bold uppercase tracking-[0.12em]" style="color: var(--text3);">Accounts ({accounts.length})</div>
        <button onclick={() => showAddAccount = !showAddAccount}
          class="text-[10px] font-bold tracking-[0.1em] px-3 py-1.5 rounded-lg"
          style="color: var(--gold); background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.2);">
          {showAddAccount ? 'CANCEL' : '+ ADD'}
        </button>
      </div>

      <!-- Add account form -->
      {#if showAddAccount}
        <div class="glass rounded-xl p-4 mb-4" style="border: 1px solid var(--glass-border);">
          <form onsubmit={handleAddAccount} class="space-y-3">
            <div>
              <label class="label" for="aname">Account Name</label>
              <input id="aname" type="text" bind:value={acctName} placeholder="Banco Santander - Cuenta Operativa" required class="input" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label" for="atype">Type</label>
                <select id="atype" bind:value={acctType} class="input">
                  <option value="bank">Bank Account</option>
                  <option value="savings">Savings</option>
                  <option value="deposit">Deposit</option>
                  <option value="bond">Bond</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label class="label" for="acur">Currency</label>
                <input id="acur" type="text" bind:value={acctCurrency} class="input" />
              </div>
            </div>
            <div>
              <label class="label" for="abank">Bank Name</label>
              <input id="abank" type="text" bind:value={acctBankName} placeholder="Banco Santander" class="input" />
            </div>
            <div>
              <label class="label" for="anum">Account Number / IBAN</label>
              <input id="anum" type="text" bind:value={acctAccountNumber} placeholder="ES12 3456..." class="input" />
            </div>
            {#if acctType === 'deposit' || acctType === 'bond'}
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="label" for="amat">Maturity Date</label>
                  <input id="amat" type="date" bind:value={acctMaturity} class="input" />
                </div>
                <div>
                  <label class="label" for="arate">Interest Rate (%)</label>
                  <input id="arate" type="text" bind:value={acctRate} placeholder="3.50" class="input" />
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

      <!-- Balance entry form -->
      {#if showBalanceForm}
        <div class="glass rounded-xl p-4 mb-4" style="border: 1px solid rgba(201,168,76,0.3);">
          <div class="text-xs font-bold mb-3" style="color: var(--gold); letter-spacing: 0.1em;">ENTER BALANCE</div>
          <form onsubmit={handleBalance} class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label" for="bdate">Date</label>
                <input id="bdate" type="date" bind:value={balanceDate} required class="input" />
              </div>
              <div>
                <label class="label" for="bamt">Balance ({acctCurrency})</label>
                <input id="bamt" type="text" bind:value={balanceAmount} placeholder="15000.00" required class="input mono" />
              </div>
            </div>
            <div>
              <label class="label" for="bnotes">Notes (optional)</label>
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
        <div class="space-y-2">
          {#each accounts as account}
            <div class="account-row">
              <div class="text-base">
                {#if account.type === 'bank'}🏦{:else if account.type === 'savings'}💰{:else if account.type === 'deposit'}📋{:else if account.type === 'bond'}📜{:else}💳{/if}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold truncate" style="color: var(--text);">{account.name}</div>
                <div class="text-[10px]" style="color: var(--text3);">
                  {account.type.toUpperCase()} · {account.currency}
                  {#if account.bankName} · {account.bankName}{/if}
                </div>
              </div>
              <button onclick={() => startBalance(account.id)}
                class="text-[10px] font-bold px-2.5 py-1.5 rounded-lg"
                style="color: var(--gold); background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.15); letter-spacing: 0.08em;">
                + BALANCE
              </button>
            </div>
          {/each}
        </div>
      {:else}
        <div class="stat-card text-center py-8">
          <div style="color: var(--text3); font-size: 12px;">No accounts yet. Add one above.</div>
        </div>
      {/if}
    </div>
  {:else}
    <div class="stat-card text-center py-12">
      <div style="color: var(--text3);">Entity not found</div>
    </div>
  {/if}
</div>
