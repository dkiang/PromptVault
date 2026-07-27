<script lang="ts">
  import ExportImport from './ExportImport.svelte';
</script>

<header class="bg-white shadow-sm border-b border-gray-200">
  <div class="max-w-4xl mx-auto px-4 py-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">PromptVault</h1>
        <p class="text-gray-600 mt-1">Your personal prompt manager</p>
      </div>
      
      <div class="flex items-center gap-4">
        <ExportImport />
      </div>
    </div>
  </div>
</header>