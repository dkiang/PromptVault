<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { storage } from '$lib/storage';
  import { config } from '$lib/config';
  import PromptCard from '$lib/components/PromptCard.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import CreatePromptForm from '$lib/components/CreatePromptForm.svelte';
  import ExportImport from '$lib/components/ExportImport.svelte';
  import PasswordManager from '$lib/components/PasswordManager.svelte';

  const darkMode = writable(false);
  const modalOpen = writable(false);

  import type { Prompt } from '$lib/storage';
  
  let prompts: Prompt[] = [];
  let filteredPrompts: Prompt[] = [];
  let searchQuery = '';
  let selectedTag = 'all';
  let allTags: string[] = [];
  let isHiddenUnlocked = false;
  let hiddenPassword = 'foobar'; // Will be loaded from storage
  let showAboutModal = false;

  function toggleDarkMode() {
    darkMode.update(v => {
      const next = !v;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('darkMode', next.toString());
      return next;
    });
  }

  async function loadPrompts() {
    try {
      prompts = await storage.getAllPrompts();
      updateFilteredPrompts();
      extractTags();
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  }

  async function loadPassword() {
    try {
      hiddenPassword = await storage.getHiddenPassword();
    } catch (error) {
      console.error('Failed to load password:', error);
    }
  }

  function extractTags() {
    const tagSet = new Set<string>();
    
    // Determine if we're in hidden mode (same logic as updateFilteredPrompts)
    const isInHiddenMode = (selectedTag === 'Hidden' && isHiddenUnlocked) || 
                          (selectedTag !== 'all' && selectedTag !== 'Hidden' && isHiddenUnlocked);
    
    prompts.forEach(prompt => {
      // Only include tags from prompts that are visible in current view
      if (isInHiddenMode) {
        // We're in hidden mode - only include tags from hidden prompts
        if (prompt.isHidden) {
          prompt.tags.forEach(tag => tagSet.add(tag));
        }
      } else {
        // We're in regular mode - only include tags from regular prompts
        if (!prompt.isHidden) {
          prompt.tags.forEach(tag => tagSet.add(tag));
        }
      }
    });
    allTags = Array.from(tagSet) as string[];
  }

  function updateFilteredPrompts() {
    let filtered = prompts;
    
    // Determine if we're in hidden mode
    const isInHiddenMode = (selectedTag === 'Hidden' && isHiddenUnlocked) || 
                          (selectedTag !== 'all' && selectedTag !== 'Hidden' && isHiddenUnlocked);
    
    // First, filter by visibility (hidden vs regular)
    if (isInHiddenMode) {
      // We're in hidden mode - show only hidden prompts
      if (!isHiddenUnlocked) {
        filtered = [];
      } else {
        filtered = filtered.filter(prompt => prompt.isHidden);
      }
    } else {
      // We're in regular mode - hide hidden prompts
      filtered = filtered.filter(prompt => !prompt.isHidden);
    }
    
    // Then apply tag filtering
    if (selectedTag !== 'all' && selectedTag !== 'Hidden') {
      filtered = filtered.filter(prompt => prompt.tags.includes(selectedTag));
    }
    
    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
      filtered = filtered.filter(prompt => {
        const promptText = (prompt.content + ' ' + prompt.tags.join(' ')).toLowerCase();
        return searchTerms.every(term => promptText.includes(term));
      });
    }
    
    filteredPrompts = filtered;
  }

  function handleSearch(event: CustomEvent<string>) {
    searchQuery = event.detail;
    updateFilteredPrompts();
  }

  function handleTagFilter(tag: string) {
    // Special case: clicking the "Hidden" category button (not a tag named "hidden")
    if (tag === 'Hidden' && !isHiddenUnlocked) {
      if (!config.isHiddenPromptsEnabled()) {
        alert('Hidden prompts feature is disabled');
        return;
      }
      const password = prompt('Enter password to view hidden prompts:');
      if (password === hiddenPassword) {
        isHiddenUnlocked = true;
        selectedTag = tag;
      } else {
        alert('Incorrect password');
        return;
      }
    } else {
      // Check if we're currently in hidden mode (either viewing all hidden or filtering by a tag while unlocked)
      const isCurrentlyInHiddenMode = (selectedTag === 'Hidden' && isHiddenUnlocked) || 
                                     (selectedTag !== 'all' && selectedTag !== 'Hidden' && isHiddenUnlocked);
      
      selectedTag = tag;
      
      // Only reset hidden unlock state if we're switching away from hidden view entirely
      if (tag !== 'Hidden' && !isCurrentlyInHiddenMode) {
        isHiddenUnlocked = false;
      }
    }
    extractTags(); // Re-extract tags for the new view
    updateFilteredPrompts();
  }

  function handlePromptCreated() {
    modalOpen.set(false);
    loadPrompts();
  }

  function handlePromptUpdated() {
    loadPrompts();
  }

  function handlePasswordReset() {
    loadPrompts();
    loadPassword();
    isHiddenUnlocked = false;
    if (selectedTag === 'Hidden') {
      selectedTag = 'all';
    }
  }

  onMount(() => {
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode) {
      const isDark = storedDarkMode === 'true';
      darkMode.set(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      darkMode.set(true);
      document.documentElement.classList.add('dark');
    }
    loadPrompts();
    loadPassword();
  });
</script>

<main class="flex h-screen bg-white text-black dark:bg-gray-900 dark:text-white">
  <!-- Sidebar -->
  <aside class="w-64 bg-gray-100 dark:bg-gray-800 p-4 overflow-y-auto">
    <h2 class="text-xl font-bold mb-4">Tags</h2>
    <ul class="space-y-2">
      <li>
        <button 
          on:click={() => handleTagFilter('all')} 
          class="w-full text-left hover:underline {selectedTag === 'all' ? 'font-bold text-blue-600' : ''}"
        >
          All Prompts ({prompts.length})
        </button>
      </li>
      {#if config.isHiddenPromptsEnabled()}
        <li>
                  <button 
          on:click={() => handleTagFilter('Hidden')} 
          class="w-full text-left hover:underline {selectedTag === 'Hidden' ? 'font-bold text-blue-600' : ''}"
        >
          {#if isHiddenUnlocked && selectedTag === 'Hidden'}
            🔓 Hidden ({prompts.filter(p => p.isHidden).length})
          {:else}
            🔒 Hidden ({prompts.filter(p => p.isHidden).length})
          {/if}
        </button>
        </li>
      {/if}
      {#each allTags as tag}
        <li>
          <button 
            on:click={() => handleTagFilter(tag)} 
            class="w-full text-left hover:underline {selectedTag === tag ? 'font-bold text-blue-600' : ''}"
          >
            {tag} ({prompts.filter(p => p.tags.includes(tag)).length})
          </button>
        </li>
      {/each}
    </ul>
    <div class="mt-6">
      <SearchBar on:search={handleSearch} bind:value={searchQuery} />
    </div>
    <div class="mt-6 space-y-2">
      <button on:click={toggleDarkMode} class="block text-sm text-gray-600 dark:text-gray-400 underline hover:text-gray-800 dark:hover:text-gray-200">Toggle Dark Mode</button>
      {#if config.isHiddenPromptsEnabled()}
        <PasswordManager on:passwordReset={handlePasswordReset} />
      {/if}
      <button on:click={() => showAboutModal = true} class="block text-sm text-gray-600 dark:text-gray-400 underline hover:text-gray-800 dark:hover:text-gray-200">About</button>
    </div>
  </aside>

  <!-- Main Content -->
  <section class="flex-1 p-6 overflow-y-auto">
    <header class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">PromptVault</h1>
      <div class="flex items-center gap-4">
        <ExportImport />
        <button on:click={() => modalOpen.set(true)} class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
          + New Prompt
        </button>
      </div>
    </header>

    <div class="grid gap-4 md:grid-cols-2">
      {#each filteredPrompts as prompt (prompt.id)}
        <PromptCard {prompt} {searchQuery} on:update={handlePromptUpdated} />
      {/each}
      
      {#if filteredPrompts.length === 0}
        <div class="col-span-full text-center py-8 text-gray-500 dark:text-gray-400">
          {#if searchQuery}
            No prompts found matching "<strong>{searchQuery}</strong>"
          {:else if selectedTag === 'Hidden'}
            No hidden prompts found
          {:else if selectedTag !== 'all'}
            No prompts found with tag "<strong>{selectedTag}</strong>"
          {:else}
            No prompts yet. Create your first prompt!
          {/if}
        </div>
      {/if}
    </div>
  </section>

  <!-- Modal -->
  {#if $modalOpen}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div class="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-md w-full">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">New Prompt</h2>
          <button on:click={() => modalOpen.set(false)} class="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <CreatePromptForm defaultHidden={selectedTag === 'Hidden' && isHiddenUnlocked} on:created={handlePromptCreated} />
      </div>
    </div>
  {/if}

  <!-- About Modal -->
  {#if showAboutModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div class="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">About</h2>
          <button on:click={() => showAboutModal = false} class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
            ✕
          </button>
        </div>
        <div class="prose dark:prose-invert max-w-none">
          
          <p class="text-gray-700 dark:text-gray-300">
            <strong>PromptVault</strong> is a modern prompt management tool built by <a href="https://www.linkedin.com/in/douglas-kiang/" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">Douglas Kiang</a>. It lets you store, search, tag, and organize your AI prompts in a clean, responsive interface.
          </p>
          
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">🔑 Key Features</h3>
          
          <ul class="space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>🔍 Search & Highlight</strong>: Full-text search across all prompts with keyword highlighting</li>
            <li><strong>🤖 Chatbot Links</strong>: Open prompts directly in ChatGPT or Perplexity</li>
            <li><strong>🏷️ Tag System</strong>: Organize prompts with dynamic, auto-updating tags</li>
            <li><strong>🔒 Hidden Prompts</strong>: Optional password-protected prompts (DevTools activation required)</li>
            <li><strong>🌙 Dark Mode</strong>: Toggle themes with persistent preferences</li>
            <li><strong>📤 Import/Export</strong>: Backup or transfer prompts via JSON</li>
            <li><strong>🔗 Share & Sync</strong>: Generate secure, account-free links to sync across devices</li>
            <li><strong>✨ Minimal UI</strong>: Content-only display with color-coded actions</li>
          </ul>
          
          <p class="text-gray-700 dark:text-gray-300 mt-6">
            This is a client-side-only app designed for personal use.<br>For details or support, <a href="https://github.com/dkiang/PromptVault" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">visit the GitHub repo</a>.
          </p>
        </div>
      </div>
    </div>
  {/if}
</main>
