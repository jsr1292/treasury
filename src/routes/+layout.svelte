<script>
  import '../app.css';
  let { children } = $props();

  const nav = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/entities', label: 'Entities', icon: '🏢' },
    { href: '/accounts', label: 'Accounts', icon: '🏦' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  let currentPath = $state('/');
</script>

<svelte:head>
  <title>Treasury</title>
</svelte:head>

<div class="min-h-screen pb-16" style="background: var(--bg-dark); color: var(--text);">
  <main>
    {@render children()}
  </main>

  <!-- Bottom nav — glassmorphism style -->
  <nav class="fixed bottom-0 left-0 right-0 glass" style="border-top: 1px solid var(--glass-border);">
    <div class="max-w-lg mx-auto flex">
      {#each nav as item}
        <a href={item.href}
          class="flex-1 flex flex-col items-center py-3 text-[10px] font-medium nav-tab"
          style="letter-spacing: 0.1em;"
          onclick={() => currentPath = item.href}>
          <span class="text-lg mb-0.5">{item.icon}</span>
          {item.label}
        </a>
      {/each}
    </div>
  </nav>
</div>
