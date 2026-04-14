<script>
  let { data } = $props();
  let tree = $derived(data.tree || []);

  const typeConfig = {
    headquarters: { icon: '🏢', color: 'var(--gold)', label: 'HQ', border: 'rgba(201,168,76,0.3)', bg: 'rgba(201,168,76,0.06)' },
    branch: { icon: '📍', color: 'var(--blue)', label: 'Branch', border: 'rgba(59,130,246,0.3)', bg: 'rgba(59,130,246,0.06)' },
    subsidiary: { icon: '🏗️', color: 'var(--green)', label: 'Subsidiary', border: 'rgba(0,229,160,0.3)', bg: 'rgba(0,229,160,0.06)' },
  };
</script>

<svelte:head>
  <title>Org Chart — Treasury</title>
</svelte:head>

<div class="max-w-5xl mx-auto page-desktop">
  <div class="mb-6">
    <div class="text-[10px] uppercase tracking-[0.1em] mb-1" style="color: var(--text3);">Corporate Structure</div>
    <h1 class="text-xl font-bold" style="color: var(--text);">Org Chart</h1>
  </div>

  {#if tree.length > 0}
    <!-- Legend -->
    <div class="flex items-center gap-4 mb-6">
      {#each Object.entries(typeConfig) as [type, cfg]}
        <div class="flex items-center gap-1.5">
          <div class="w-3 h-3 rounded" style="background: {cfg.color};"></div>
          <span class="text-[10px] font-medium" style="color: var(--text3);">{cfg.label}</span>
        </div>
      {/each}
    </div>

    <!-- Tree -->
    <div class="org-tree">
      {#each tree as root}
        {@render node(root, 0)}
      {/each}
    </div>
  {:else}
    <div class="stat-card text-center py-12">
      <div class="text-3xl mb-3">🌳</div>
      <div style="color: var(--text3); font-size: 12px;">No entities yet. Create some to see the org chart.</div>
      <a href="/entities" class="inline-block mt-3 px-4 py-2 rounded-lg text-xs font-semibold btn-gold no-underline">Create Entities →</a>
    </div>
  {/if}
</div>

{#snippet node(entity, depth)}
  {@const cfg = typeConfig[entity.type] || typeConfig.headquarters}
  
  <div class="org-node" style="--depth: {depth};">
    <!-- Connector line -->
    {#if depth > 0}
      <div class="org-connector" style="--parent-color: {cfg.color};"></div>
    {/if}

    <!-- Card -->
    <a href="/entities/{entity.id}" class="org-card no-underline" style="border-color: {cfg.border}; background: {cfg.bg};">
      <div class="flex items-center gap-2.5">
        <span class="text-lg">{cfg.icon}</span>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold truncate" style="color: var(--text);">{entity.name}</div>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-[10px] font-semibold uppercase tracking-[0.06em]" style="color: {cfg.color};">{cfg.label}</span>
            <span class="text-[10px]" style="color: var(--text3);">{entity.currency}</span>
            {#if entity.country}
              <span class="text-[10px]" style="color: var(--text3);">· {entity.country}</span>
            {/if}
          </div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 16px; height: 16px; color: var(--text3); flex-shrink: 0;">
          <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </a>

    <!-- Children -->
    {#if entity.children && entity.children.length > 0}
      <div class="org-children">
        {#each entity.children as child}
          {@render node(child, depth + 1)}
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

<style>
  .org-tree {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .org-node {
    position: relative;
  }

  .org-connector {
    position: absolute;
    left: 24px;
    top: -12px;
    width: 2px;
    height: 24px;
    background: var(--glass-border);
  }

  .org-connector::before {
    content: '';
    position: absolute;
    top: 0;
    left: -6px;
    width: 14px;
    height: 2px;
    background: var(--glass-border);
  }

  .org-card {
    display: block;
    padding: 14px 18px;
    border-radius: 10px;
    border: 1px solid;
    transition: transform 0.15s, box-shadow 0.15s;
    margin-bottom: 8px;
  }

  .org-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-lg);
  }

  .org-children {
    padding-left: 32px;
    position: relative;
  }

  /* Vertical line connecting siblings */
  .org-children::before {
    content: '';
    position: absolute;
    left: 24px;
    top: 0;
    bottom: 20px;
    width: 2px;
    background: var(--glass-border);
  }

  /* Last child — stop the vertical line */
  .org-children > .org-node:last-child > .org-connector {
    height: 12px;
  }

  @media (min-width: 768px) {
    .org-children {
      padding-left: 40px;
    }
    .org-children::before {
      left: 32px;
    }
    .org-connector {
      left: 32px;
    }
  }
</style>
