<script>
  let toasts = $state([]);
  let id = 0;

  export function show(message, type = 'success') {
    const toast = { id: id++, message, type };
    toasts = [...toasts, toast];
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== toast.id);
    }, 3000);
  }
</script>

{#if toasts.length > 0}
  <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-80">
    {#each toasts as toast (toast.id)}
      <div
        class="flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium shadow-lg transition-all"
        style="
          background: {toast.type === 'success' ? 'var(--green)' : toast.type === 'error' ? 'var(--red)' : 'var(--gold)'};
          color: {toast.type === 'success' || toast.type === 'error' ? '#fff' : 'var(--bg-dark)'};
          animation: toastIn 0.2s ease-out;
        "
      >
        <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✗' : 'ℹ'}</span>
        <span>{toast.message}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  @keyframes toastIn {
    from { transform: translateY(-8px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>
