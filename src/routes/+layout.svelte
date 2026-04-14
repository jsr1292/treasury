<script>
  import '../app.css';
  import { page } from '$app/stores';
  import Toast from '$lib/components/Toast.svelte';
  let { children } = $props();
  let currentPath = $derived($page.url.pathname);

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
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;
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
  const mobilePrimary = navFlat.slice(0, 4);
  const mobileSecondary = navFlat.slice(4);

  // Page title from path
  let pageTitle = $derived(() => {
    const path = currentPath;
    if (path === '/') return 'Dashboard';
    const match = navFlat.find(n => path.startsWith(n.href) && n.href !== '/');
    return match?.label || '';
  });
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
      </div>

      <!-- Nav sections -->
      <nav class="flex-1 py-4 px-3 overflow-auto">
        {#each navSections as section}
          {#if section.label}
            <div class="text-[9px] font-semibold uppercase tracking-[0.14em] px-3 mt-5 mb-2" style="color: var(--text3);">{section.label}</div>
          {/if}
          {#each section.items as item}
            {@const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href))}
            <a href={item.href}
              class="flex items-center gap-2.5 px-3 py-2 rounded-lg no-underline transition-all"
              style="color: {isActive ? 'var(--gold)' : 'var(--text3)'}; background: {isActive ? 'rgba(201,168,76,0.08)' : 'transparent'}; font-weight: {isActive ? '500' : '400'};">
              <div style="width: 18px; height: 18px; opacity: {isActive ? '1' : '0.6'};">{@html item.icon}</div>
              <span style="font-size: 13px;">{item.label}</span>
            </a>
          {/each}
        {/each}
      </nav>

      <!-- Sidebar footer -->
      <div class="px-4 py-3" style="border-top: 1px solid var(--glass-border);">
        <button onclick={toggleTheme} class="flex items-center gap-2.5 w-full px-2 py-2 rounded-lg no-underline transition-colors" style="background: none; border: none; cursor: pointer; color: var(--text3);">
          <span class="text-sm">{theme === 'dark' ? '🌙' : '☀️'}</span>
          <span style="font-size: 12px;">{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </aside>

    <!-- Main area -->
    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Desktop top bar -->
      <header class="hidden md:flex items-center justify-between px-8 py-3.5" style="border-bottom: 1px solid var(--glass-border); background: var(--bg-dark); position: sticky; top: 0; z-index: 30;">
        <div class="flex items-center gap-3">
          <h2 class="text-sm font-semibold" style="color: var(--text);">{pageTitle()}</h2>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-[10px] mono" style="color: var(--text3);">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="flex-1 pb-20 md:pb-8 overflow-auto">
        {@render children()}
      </main>
    </div>
  </div>


  <!-- Mobile theme toggle (bottom-right, above nav, z-index below More panel) -->
  <div class="md:hidden fixed bottom-20 right-4" style="z-index: 45;">
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

    <div class="glass" style="border-top: 1px solid var(--glass-border);">
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
</style>
