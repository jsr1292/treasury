<script>
  import '../app.css';
  import { page } from '$app/stores';
  let { children } = $props();
  let currentPath = $derived($page.url.pathname);

  const nav = [
    {
      href: '/',
      label: 'Dashboard',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      href: '/entities',
      label: 'Entities',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      href: '/accounts',
      label: 'Accounts',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      href: '/fx',
      label: 'FX Rates',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    },
    {
      href: '/settings',
      label: 'Settings',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="3"/></svg>',
    },
  ];
</script>

<div class="min-h-screen" style="background: var(--bg-dark); color: var(--text);">
  <div class="flex min-h-screen">
    <!-- Desktop sidebar (hidden on mobile) -->
    <aside class="hidden md:flex flex-col w-56 shrink-0 glass" style="border-right: 1px solid var(--glass-border); height: 100vh; position: sticky; top: 0;">
      <!-- Logo -->
      <div class="px-5 py-6" style="border-bottom: 1px solid var(--glass-border);">
        <div class="text-lg font-bold" style="color: var(--gold); letter-spacing: 0.05em;">📊 Treasury</div>
        <div class="text-[10px] mt-0.5" style="color: var(--text3); letter-spacing: 0.1em;">CASH MANAGEMENT</div>
      </div>

      <!-- Nav items -->
      <nav class="flex-1 py-4 px-3 space-y-1">
        {#each nav as item}
          {@const isActive = currentPath === item.href}
          <a href={item.href}
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg no-underline transition-colors"
            style="color: {isActive ? 'var(--gold)' : 'var(--text3)'}; background: {isActive ? 'rgba(201,168,76,0.1)' : 'transparent'};">
            <div style="width: 20px; height: 20px;">{@html item.icon}</div>
            <span style="font-size: 12px; letter-spacing: 0.05em; font-weight: {isActive ? '600' : '400'};">{item.label}</span>
          </a>
        {/each}
      </nav>

      <!-- Footer -->
      <div class="px-5 py-4" style="border-top: 1px solid var(--glass-border);">
        <div class="text-[10px]" style="color: var(--text3);">Treasury v0.1</div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 pb-20 md:pb-6 overflow-auto">
      {@render children()}
    </main>
  </div>

  <!-- Mobile bottom nav (hidden on desktop) -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 glass" style="border-top: 1px solid var(--glass-border); z-index: 50;">
    <div class="max-w-lg mx-auto flex">
      {#each nav as item}
        {@const isActive = currentPath === item.href}
        <a href={item.href}
          class="flex-1 flex flex-col items-center py-3 gap-1 no-underline transition-colors"
          style="color: {isActive ? 'var(--gold)' : 'var(--text3)'};">
          <div style="width: 22px; height: 22px;">{@html item.icon}</div>
          <span style="font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; line-height: 1;">{item.label}</span>
        </a>
      {/each}
    </div>
  </nav>
</div>

<style>
  aside :global(svg), nav :global(svg) {
    width: inherit;
    height: inherit;
  }
</style>
