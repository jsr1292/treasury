<script>
  let { data } = $props();
  import { ACCOUNT_TYPES } from '$lib/constants';

  // Normalize: API returns flat {name, type, ...}, DB returns {account, entity}
  const accounts = (data.accounts || []).map((a) => {
    if (a.account) return a; // DB format
    return { account: a, entity: { name: a.entityName || '—' } }; // API format
  });
</script>

<svelte:head>
  <title>Accounts — Treasury</title>
</svelte:head>

<div class="max-w-5xl mx-auto page-desktop">
  <div class="mb-5">
    <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Financial Instruments</div>
    <h1 class="text-xl font-bold" style="color: var(--text);">Accounts</h1>
  </div>

  {#if data.accounts.length > 0}
    <div class="stat-card hidden md:block" style="padding: 0; overflow: hidden;">
      <table class="data-table">
        <thead>
          <tr>
            <th>Account</th>
            <th>Entity</th>
            <th>Type</th>
            <th>Bank</th>
            <th>Currency</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each accounts as { account, entity }}
            {@const cfg = ACCOUNT_TYPES[account.type] || ACCOUNT_TYPES.other || { label: account.type || 'Account', icon: '💳', badge: 'badge-gold' }}
            <tr>
              <td><a href="/accounts/{account.id}" class="no-underline" style="color: var(--text); font-weight: 500;">{account.name}</a></td>
              <td style="color: var(--text3);">{entity.name}</td>
              <td><span class="badge {cfg.badge}">{cfg.icon} {cfg.label}</span></td>
              <td style="color: var(--text3);">{account.bankName || '—'}</td>
              <td class="mono" style="color: var(--text3);">{account.currency}</td>
              <td><span class="badge {account.isActive ? 'badge-green' : 'badge-red'}">{account.isActive ? 'Active' : 'Inactive'}</span></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <div class="md:hidden space-y-2">
      {#each accounts as { account, entity }}
        {@const cfg = ACCOUNT_TYPES[account.type] || ACCOUNT_TYPES.other || { label: account.type || 'Account', icon: '💳', badge: 'badge-gold' }}
        <a href="/accounts/{account.id}" class="account-row block no-underline">
          <div class="text-base">{cfg.icon}</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold truncate" style="color: var(--text);">{account.name}</div>
            <div class="text-[10px]" style="color: var(--text3);">{entity.name} · {account.currency}{#if account.bankName} · {account.bankName}{/if}</div>
          </div>
          <span class="badge {account.isActive ? 'badge-green' : 'badge-red'}">{account.isActive ? 'Active' : 'Off'}</span>
        </a>
      {/each}
    </div>
  {:else}
    <div class="stat-card text-center py-12">
      <div class="text-3xl mb-3">🏦</div>
      <div style="color: var(--text3); font-size: 12px;">No accounts yet. Create an entity first, then add accounts.</div>
    </div>
  {/if}
</div>
