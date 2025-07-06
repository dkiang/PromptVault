<script lang="ts">
  import { storage } from '../storage';

  let fileInput: HTMLInputElement;
  let isExporting = false;
  let isImporting = false;
  let isGeneratingLink = false;
  let shareLink = '';
  let showShareModal = false;

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

  async function generateShareLink() {
    isGeneratingLink = true;
    
    try {
      shareLink = await storage.generateSecureShareLink();
      showShareModal = true;
    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert('Failed to generate share link');
    } finally {
      isGeneratingLink = false;
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link');
    }
  }

  async function syncFromUrl() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const shareData = urlParams.get('data');
      
      if (shareData) {
        const confirmSync = confirm('This will import prompts from the shared link. Continue?');
        if (confirmSync) {
          const decoded = decodeURIComponent(atob(shareData));
          await storage.importPrompts(decoded);
          
          // Clean up URL
          const newUrl = window.location.pathname;
          window.history.replaceState({}, '', newUrl);
          
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Failed to sync prompts from link');
    }
  }

  function closeShareModal() {
    showShareModal = false;
    shareLink = '';
  }
  
  // Auto-detect share link on load
  import { onMount } from 'svelte';
  
  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('data')) {
      syncFromUrl();
    }
  });
</script>

<div class="flex gap-2 flex-wrap">
  <button
    on:click={exportPrompts}
    disabled={isExporting}
    class="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
  >
    {isExporting ? 'Exporting...' : 'Export'}
  </button>
  
  <button
    on:click={importPrompts}
    disabled={isImporting}
    class="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
  >
    {isImporting ? 'Importing...' : 'Import'}
  </button>
  
  <button
    on:click={generateShareLink}
    disabled={isGeneratingLink}
    class="px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
  >
    {isGeneratingLink ? 'Generating...' : 'Share'}
  </button>
</div>

<input
  bind:this={fileInput}
  type="file"
  accept=".json"
  on:change={handleFileSelected}
  class="hidden"
/>

<!-- Share Modal -->
{#if showShareModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div class="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">Share Your Prompts</h3>
        <button on:click={closeShareModal} class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ✕
        </button>
      </div>
      
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Copy this link to share your prompts across devices. The link contains all your prompts encoded in the URL.
        </p>
        
        <div class="flex gap-2">
          <input
            type="text"
            value={shareLink}
            readonly
            class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none text-sm"
          />
          <button
            on:click={copyShareLink}
            class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            Copy
          </button>
        </div>
        
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Note: Hidden prompts are included in the share link. Anyone with this link can access all your prompts.
        </p>
      </div>
    </div>
  </div>
{/if}