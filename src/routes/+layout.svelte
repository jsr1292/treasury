<script>
  import '../app.css';
  let { children } = $props();

  const nav = [
    { href: '/', label: 'Dashboard', icon: '📊' },
    { href: '/entities', label: 'Entities', icon: '🏢' },
    { href: '/accounts', label: 'Accounts', icon: '🏦' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
  ];
</script>

<div class="min-h-screen bg-[var(--bg-dark)] text-[var(--text-primary)]">
  <main class="pb-16">
    {@render children()}
  </main>

  <nav class="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)]/95 backdrop-blur-lg border-t border-[var(--border)]">
    <div class="max-w-lg mx-auto flex">
      {#each nav as item}
        <a href={item.href}
          class="flex-1 flex flex-col items-center py-2.5 text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <span class="text-lg mb-0.5">{item.icon}</span>
          {item.label}
        </a>
      {/each}
    </div>
  </nav>
</div>
