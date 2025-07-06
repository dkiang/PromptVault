<script lang="ts">
  import { storage } from '../storage';

  let fileInput: HTMLInputElement;
  let isExporting = false;
  let isImporting = false;

  async function exportPrompts() {
    isExporting = true;
    
    try {
      const data = await storage.exportPrompts();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `promptvault-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      isExporting = false;
    }
  }

  async function importPrompts() {
    fileInput.click();
  }

  async function handleFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;
    
    isImporting = true;
    
    try {
      const text = await file.text();
      await storage.importPrompts(text);
      
      window.location.reload();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import prompts. Please check the file format.');
    } finally {
      isImporting = false;
      target.value = '';
    }
  }
</script>

<div class="flex gap-2">
  <button
    on:click={exportPrompts}
    disabled={isExporting}
    class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
  >
    {isExporting ? 'Exporting...' : 'Export'}
  </button>
  
  <button
    on:click={importPrompts}
    disabled={isImporting}
    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
  >
    {isImporting ? 'Importing...' : 'Import'}
  </button>
</div>

<input
  bind:this={fileInput}
  type="file"
  accept=".json"
  on:change={handleFileSelected}
  class="hidden"
/>