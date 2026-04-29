<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import Toast from '$lib/components/Toast.svelte';
  let { children, data } = $props();
  let currentPath = $derived($page.url.pathname);

  // Company switcher
  let selectedCompanyIndex = $state(data.selectedCompany?.index ?? 0);
  let showCompanyDropdown = $state(false);

  function selectCompany(index: number) {
    selectedCompanyIndex = index;
    showCompanyDropdown = false;
    // Set cookie and reload to pick up new company data
    document.cookie = `company=${index}; path=/; max-age=86400`;
    window.location.reload();
  }

  function getCompanyLabel() {
    if (!data.isMultiCompany) return data.selectedCompany?.name || 'Company';
    if (selectedCompanyIndex === -1) return 'All Companies';
    return data.companies?.[selectedCompanyIndex]?.name || 'Company';
  }

  // Theme
  let theme = $state('dark');
  $effect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('treasury-theme') || 'dark';
      theme = saved;
      document.documentElement.setAttribute('data-theme', saved);
    }
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('treasury-theme', theme);
    updateThemeColor();
  }

  function updateThemeColor() {
    const color = theme === 'dark' ? '#07090f' : '#f8f7f4';
    
    // iOS Safari ignores meta.content mutations — remove and re-create
    const old = document.querySelector('meta[name="theme-color"]');
    if (old) old.remove();
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    document.head.appendChild(meta);
    
    // Update both html AND body — iOS uses body for status bar
    document.documentElement.style.background = color;
    document.body.style.background = color;
    
    // Force iOS repaint nudge
    document.documentElement.style.paddingTop = '1px';
    requestAnimationFrame(() => {
      document.documentElement.style.paddingTop = '';
    });
  }

  $effect(() => {
    if (typeof window !== 'undefined') {
      updateThemeColor();
    }
  });

  const navSections = [
    {
      label: null,
      items: [
        { href: '/', label: 'Dashboard', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
      ]
    },
    {
      label: 'Portfolio',
      items: [
        { href: '/entities', label: 'Entities', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        { href: '/orgchart', label: 'Org Chart', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 4v4m0 4v4m-4-4h4m4 0h4M7 8h10M7 16h10" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        { href: '/accounts', label: 'Accounts', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
        { href: '/instruments', label: 'Investments', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
      ]
    },
    {
      label: 'Market',
      items: [
        { href: '/fx', label: 'FX Rates', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
      ]
    },
    {
      label: 'System',
      items: [
        { href: '/settings', label: 'Settings', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3"/></svg>' },
      ]
    },
  ];

  // Flatten nav for mobile
  const navFlat = navSections.flatMap(s => s.items);

  // Expose toast globally so pages can use it
  let toastRef;
  $effect(() => {
    if (typeof window !== 'undefined' && toastRef) {
      window.__toast = toastRef.show;
    }
  });
  let mobileMoreOpen = $state(false);
  let showAlertSheet = $state(false);
  const mobilePrimary = navFlat.slice(0, 4);
  const mobileSecondary = navFlat.slice(4);

  // Page title from path
  let pageTitle = $derived(() => {
    const path = currentPath;
    if (path === '/') return 'Dashboard';
    const match = navFlat.find(n => path.startsWith(n.href) && n.href !== '/');
    return match?.label || '';
  });

  // ─── Refresh & Auto-refresh ───────────────────────────────────────
  let lastRefreshed = $state<Date | null>(null);
  let autoRefreshEnabled = $state(false);
  let refreshInterval = $state(0); // minutes, from connector config
  let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

  // Load last refreshed from localStorage, use server refreshInterval as default
  $effect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('treasury-last-refreshed');
      if (stored) {
        lastRefreshed = new Date(parseInt(stored, 10));
      }
      const storedAuto = localStorage.getItem('treasury-auto-refresh');
      autoRefreshEnabled = storedAuto === 'true';
      // Use server-provided refreshInterval if available, otherwise localStorage
      const serverInterval = data.refreshInterval || 0;
      refreshInterval = serverInterval || parseInt(localStorage.getItem('treasury-refresh-interval') || '0', 10) || 0;
      if (serverInterval && serverInterval !== refreshInterval) {
        refreshInterval = serverInterval;
        localStorage.setItem('treasury-refresh-interval', String(refreshInterval));
      }
    }
  });

  // Auto-refresh timer
  $effect(() => {
    if (typeof window === 'undefined') return;
    
    if (autoRefreshEnabled && refreshInterval > 0) {
      stopAutoRefresh();
      autoRefreshTimer = setInterval(() => {
        doRefresh();
      }, refreshInterval * 60 * 1000);
    } else {
      stopAutoRefresh();
    }
    
    return () => stopAutoRefresh();
  });

  function stopAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  async function doRefresh() {
    try {
      await fetch('/api/connector/refresh', { method: 'POST' });
      lastRefreshed = new Date();
      localStorage.setItem('treasury-last-refreshed', lastRefreshed.getTime().toString());
      window.location.reload();
    } catch (e) {
      console.error('Refresh failed:', e);
    }
  }

  function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    localStorage.setItem('treasury-auto-refresh', String(autoRefreshEnabled));
  }

  function getRefreshLabel() {
    if (!lastRefreshed) return null;
    const mins = Math.floor((Date.now() - lastRefreshed.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 min ago';
    return `${mins} min ago`;
  }
</script>

<div class="min-h-screen" style="background: var(--bg-dark); color: var(--text);">
  <Toast bind:this={toastRef} />
  <div class="flex min-h-screen">
    <!-- Desktop sidebar -->
    <aside class="hidden md:flex flex-col w-60 shrink-0" style="background: var(--bg2); border-right: 1px solid var(--glass-border); height: 100vh; position: sticky; top: 0;">
      <!-- Logo -->
      <div class="px-6 py-5" style="border-bottom: 1px solid var(--glass-border);">
        <div class="flex items-center gap-2.5">
          <div class="flex items-center justify-center w-8 h-8 rounded-lg" style="background: linear-gradient(135deg, var(--gold), var(--gold2));">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 16px; height: 16px;">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div>
            <div class="text-sm font-bold" style="color: var(--text); letter-spacing: 0.02em;">Treasury</div>
            <div class="text-[9px]" style="color: var(--text3); letter-spacing: 0.08em;">CASH MANAGEMENT</div>
          </div>
        </div>

        <!-- Company switcher (only show when multi-company or when there's a company name) -->
        {#if data.companies && data.companies.length > 0}
          <div class="relative mt-3">
            <button
              onclick={() => showCompanyDropdown = !showCompanyDropdown}
              class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors"
              style="background: var(--bg-card); border: 1px solid var(--glass-border); color: var(--text); cursor: pointer;"
            >
              <div class="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 12px; height: 12px; color: var(--gold);">
                  <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="font-medium truncate">{getCompanyLabel()}</span>
              </div>
              {#if data.isMultiCompany || data.companies.length > 1}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 10px; height: 10px; color: var(--text3); flex-shrink: 0; transition: transform 0.15s; transform: rotate({showCompanyDropdown ? 180 : 0}deg);">
                  <path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              {/if}
            </button>

            {#if showCompanyDropdown}
              <div class="absolute top-full left-0 right-0 mt-1 py-1 rounded-lg z-50" style="background: var(--bg2); border: 1px solid var(--glass-border); box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
                {#if data.isMultiCompany}
                  <button
                    onclick={() => selectCompany(-1)}
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                    style="color: {selectedCompanyIndex === -1 ? 'var(--gold)' : 'var(--text3)'}; background: {selectedCompanyIndex === -1 ? 'rgba(201,168,76,0.08)' : 'transparent'};"
                    onmouseenter={(e) => { if (selectedCompanyIndex !== -1) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onmouseleave={(e) => { if (selectedCompanyIndex !== -1) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 12px; height: 12px;">
                      <path d="M4 6h16M4 12h16M4 18h7" stroke-linecap="round"/>
                    </svg>
                    All Companies
                    {#if data.companies.length > 0}
                      <span class="ml-auto text-[9px] px-1.5 py-0.5 rounded" style="background: rgba(201,168,76,0.12); color: var(--gold);">{data.companies.length}</span>
                    {/if}
                  </button>
                  <div class="my-1" style="border-top: 1px solid var(--glass-border);"></div>
                {/if}
                {#each data.companies || [] as company, i}
                  <button
                    onclick={() => selectCompany(i)}
                    class="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                    style="color: {selectedCompanyIndex === i ? 'var(--gold)' : 'var(--text3)'}; background: {selectedCompanyIndex === i ? 'rgba(201,168,76,0.08)' : 'transparent'};"
                    onmouseenter={(e) => { if (selectedCompanyIndex !== i) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onmouseleave={(e) => { if (selectedCompanyIndex !== i) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style="width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
                      {#if selectedCompanyIndex === i}
                        <span style="color: var(--gold);">●</span>
                      {:else}
                        <span style="color: var(--text3); opacity: 0.4;">○</span>
                      {/if}
                    </span>
                    {company.name}
                  </button>
                {/each}
              </div>
            {/if}
          </div>
          <!-- Close dropdown when clicking outside -->
          {#if showCompanyDropdown}
            <div class="fixed inset-0 z-40" onclick={() => showCompanyDropdown = false}></div>
          {/if}
        {/if}
      </div>

      <!-- Nav sections -->
      <nav class="flex-1 py-4 px-3 overflow-auto flex flex-col justify-between">
        <div>
          {#each navSections as section}
            {#if section.label}
              <div class="text-[9px] font-semibold uppercase tracking-[0.14em] px-3 mt-5 mb-2" style="color: var(--text3);">{section.label}</div>
            {/if}
            {#each section.items as item}
              {@const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))}
              <a href={item.href}
                class="flex items-center gap-2.5 px-3 py-2 rounded-lg no-underline transition-all mb-0.5"
                style="color: {isActive ? 'var(--gold)' : 'var(--text3)'}; background: {isActive ? 'rgba(201,168,76,0.08)' : 'transparent'}; font-weight: {isActive ? '500' : '400'};">
                <div style="width: 18px; height: 18px; opacity: {isActive ? '1' : '0.6'}; flex-shrink: 0;">{@html item.icon}</div>
                <span style="font-size: 13px;">{item.label}</span>
              </a>
            {/each}
          {/each}
        </div>
        <div class="mt-4">
          <button onclick={toggleTheme} class="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg no-underline transition-colors" style="background: none; border: none; cursor: pointer; color: var(--text3);">
            <span class="text-sm">{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span style="font-size: 12px;">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </nav>
    </aside>

    <!-- Main area -->
    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Desktop top bar -->
      <header class="hidden md:flex items-center justify-between px-6 py-3.5 gap-6" style="border-bottom: 1px solid var(--glass-border); background: var(--bg-dark); position: sticky; top: 0; z-index: 30; min-height: 56px;">
        <div class="flex items-center gap-3 flex-shrink-0">
          <h2 class="text-sm font-semibold" style="color: var(--text);">{pageTitle()}</h2>
        </div>
        <div class="flex items-center gap-4 flex-1 justify-end">
          <div class="relative" style="width: 280px;">
            <input
              type="search"
              placeholder="Search accounts, entities…"
              class="w-full"
              style="background: var(--input-bg); border: 1px solid var(--input-border); border-radius: 8px; padding: 6px 12px 6px 32px; font-size: 12px; color: var(--text); outline: none; transition: border-color 0.15s;"
              onfocus={(e) => e.currentTarget.style.borderColor = 'var(--input-focus)'}
              onblur={(e) => e.currentTarget.style.borderColor = 'var(--input-border)'}
            />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 13px; height: 13px; color: var(--text3); pointer-events: none;">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          {#if data.fxRates?.length}
            <div class="flex items-center gap-3" style="font-size: 11px;">
              {#each data.fxRates.slice(0, 3) as rate}
                <div class="flex items-center gap-1.5">
                  <span style="color: var(--text3);">{rate.base}/{rate.quote}</span>
                  <span class="mono font-medium" style="color: var(--text);">{Number(rate.rate).toFixed(4)}</span>
                </div>
              {/each}
            </div>
          {:else}
            <div class="flex items-center gap-3" style="font-size: 11px;">
              <div class="flex items-center gap-1.5">
                <span style="color: var(--text3);">EUR/USD</span>
                <span class="mono" style="color: var(--text3);">—</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span style="color: var(--text3);">EUR/GBP</span>
                <span class="mono" style="color: var(--text3);">—</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span style="color: var(--text3);">EUR/CHF</span>
                <span class="mono" style="color: var(--text3);">—</span>
              </div>
            </div>
          {/if}
          {#if data.anomalies?.length > 0}
            <button
              onclick={() => showAlertSheet = true}
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer"
              style="background: rgba(255,77,106,0.1); border: 1px solid rgba(255,77,106,0.2); transition: background 0.15s;"
              onmouseenter={(e) => e.currentTarget.style.background = 'rgba(255,77,106,0.18)'}
              onmouseleave={(e) => e.currentTarget.style.background = 'rgba(255,77,106,0.10)'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" style="width:13px;height:13px;"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span style="color: var(--red); font-size: 11px; font-weight: 600;">{data.anomalies.length}</span>
            </button>
          {/if}

          <!-- Refresh button -->
          <button
            onclick={doRefresh}
            title="Refresh data"
            class="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-colors"
            style="background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.15);"
            onmouseenter={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.15)'; }}
            onmouseleave={(e) => { e.currentTarget.style.background = 'rgba(201,168,76,0.08)'; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2" style="width:14px;height:14px;">
              <path d="M1 4v6h6M23 20v-6h-6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>

          <!-- Last refreshed indicator -->
          {#if lastRefreshed}
            <div class="text-[10px] mono" style="color: var(--text3);" title="Last refreshed">
              {getRefreshLabel()}
            </div>
          {/if}

          <div class="text-[10px] mono" style="color: var(--text3);">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 md:pb-8 overflow-auto" style="padding-bottom: calc(7rem + env(safe-area-inset-bottom, 0px));">
        {@render children()}
      </main>
    </div>
  </div>

  <!-- Alert Sheet -->
  {#if showAlertSheet}
    <!-- Backdrop -->
    <div class="fixed inset-0" style="z-index: 99; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px);" onclick={() => showAlertSheet = false}></div>
    <!-- Sheet -->
    <div class="fixed top-0 right-0 h-full flex flex-col" style="z-index: 100; width: min(420px, 100vw); background: var(--bg2); border-left: 1px solid var(--glass-border); animation: slideInRight 0.15s ease-out;">
      <!-- Sheet header -->
      <div class="flex items-center justify-between px-5 py-4" style="border-bottom: 1px solid var(--glass-border);">
        <div class="flex items-center gap-2">
          <span style="color: var(--red);">⚠️</span>
          <span class="text-sm font-semibold" style="color: var(--text);">Balance Alerts</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full" style="background: rgba(255,77,106,0.12); color: var(--red);">{data.anomalies?.length ?? 0}</span>
        </div>
        <button onclick={() => showAlertSheet = false} class="flex items-center justify-center w-8 h-8 rounded-lg" style="color: var(--text3); transition: background 0.15s;" onmouseenter={(e) => e.currentTarget.style.background='var(--bg-card-hover)'} onmouseleave={(e) => e.currentTarget.style.background='transparent'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M18 6 6 18M6 6l12 12" stroke-linecap="round"/></svg>
        </button>
      </div>
      <!-- Sheet content -->
      <div class="flex-1 overflow-auto p-4 space-y-3">
        {#if data.anomalies?.length === 0}
          <div class="text-center py-12" style="color: var(--text3);">
            <div class="text-3xl mb-3">✅</div>
            <div class="text-sm">No alerts — everything looks good</div>
          </div>
        {:else}
          {#each data.anomalies ?? [] as anomaly}
            <div class="stat-card" style="border-left: 3px solid {anomaly.severity === 'critical' ? 'var(--red)' : '#ffd70a'};">
              <div class="flex items-start justify-between gap-3 mb-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-sm">{anomaly.severity === 'critical' ? '🔴' : '🟡'}</span>
                  <span class="text-[10px] font-semibold uppercase tracking-[0.08em]" style="color: {anomaly.severity === 'critical' ? 'var(--red)' : '#ffd70a'};">{anomaly.type === 'spike' && anomaly.message?.includes('-') ? 'Drop' : anomaly.type}</span>
                  {#if anomaly.accountName}
                    <span class="text-[10px] px-2 py-0.5 rounded" style="background: var(--bg-card); color: var(--text3);">{anomaly.accountName}</span>
                  {/if}
                </div>
                <span class="text-[9px] mono" style="color: var(--text3);">{anomaly.createdAt ? new Date(anomaly.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
              </div>
              <div class="text-sm mb-3" style="color: var(--text);">{anomaly.message}</div>
              <div class="flex items-center gap-2">
                <button class="text-[10px] px-3 py-1.5 rounded-lg" style="background: rgba(201,168,76,0.1); color: var(--gold); border: 1px solid rgba(201,168,76,0.2); cursor: pointer;">
                  Review →
                </button>
                <button class="text-[10px] px-3 py-1.5 rounded-lg" style="background: var(--input-bg); color: var(--text3); border: 1px solid var(--input-border); cursor: pointer;">
                  Dismiss
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <!-- Mobile theme toggle (bottom-right, above nav, z-index below More panel) -->
  <div class="md:hidden fixed bottom-[6.5rem] right-4" style="z-index: 45;">
    <button onclick={toggleTheme}
      class="flex items-center justify-center w-10 h-10 rounded-full glass"
      style="border: 1px solid var(--glass-border); cursor: pointer; box-shadow: var(--shadow);">
      <span class="text-sm">{theme === 'dark' ? '🌙' : '☀️'}</span>
    </button>
  </div>

  <!-- Mobile bottom nav -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0" style="z-index: 50;">
    <!-- Expanded "More" panel -->
    {#if mobileMoreOpen}
      <div class="fixed inset-0" style="z-index: 49;" onclick={() => mobileMoreOpen = false}></div>
      <div class="fixed bottom-16 left-3 right-3 glass rounded-xl p-2" style="z-index: 50; box-shadow: var(--shadow-lg); animation: slideUp 0.15s ease-out;">
        {#each mobileSecondary as item}
          {@const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))}
          <a href={item.href} onclick={() => mobileMoreOpen = false}
            class="flex items-center gap-3 px-4 py-3 rounded-lg no-underline transition-colors"
            style="color: {isActive ? 'var(--gold)' : 'var(--text)'}; background: {isActive ? 'rgba(201,168,76,0.08)' : 'transparent'};">
            <div style="width: 18px; height: 18px;">{@html item.icon}</div>
            <span style="font-size: 13px; font-weight: {isActive ? '500' : '400'};">{item.label}</span>
          </a>
        {/each}
      </div>
    {/if}

    <div class="glass" style="border-top: 1px solid var(--glass-border); padding-bottom: env(safe-area-inset-bottom, 0px);">
      <div class="max-w-lg mx-auto flex">
        {#each mobilePrimary as item}
          {@const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))}
          <a href={item.href}
            class="flex-1 flex flex-col items-center py-3 gap-1 no-underline transition-colors"
            style="color: {isActive ? 'var(--gold)' : 'var(--text3)'};">
            <div style="width: 22px; height: 22px;">{@html item.icon}</div>
            <span style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; line-height: 1;">{item.label}</span>
          </a>
        {/each}
        <!-- More button -->
        {#if mobileSecondary.length > 0}
          <button onclick={() => mobileMoreOpen = !mobileMoreOpen}
            class="flex-1 flex flex-col items-center py-3 gap-1 no-underline transition-colors"
            style="color: {mobileMoreOpen ? 'var(--gold)' : 'var(--text3)'}; background: none; border: none; cursor: pointer;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 22px; height: 22px;">
              <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
            <span style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; line-height: 1;">More</span>
          </button>
        {/if}
      </div>
    </div>
  </nav>
</div>

<style>
  aside :global(svg), nav :global(svg) {
    width: inherit;
    height: inherit;
  }
  @keyframes slideUp {
    from { transform: translateY(8px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
</style>
