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
    prompts.forEach(prompt => {
      // Only include tags from prompts that are visible in current view
      if (selectedTag === 'hidden') {
        if (prompt.isHidden) {
          prompt.tags.forEach(tag => tagSet.add(tag));
        }
      } else {
        if (!prompt.isHidden) {
          prompt.tags.forEach(tag => tagSet.add(tag));
        }
      }
    });
    allTags = Array.from(tagSet) as string[];
  }

  function updateFilteredPrompts() {
    let filtered = prompts;
    
    if (selectedTag === 'hidden') {
      if (!isHiddenUnlocked) {
        filtered = [];
      } else {
        filtered = filtered.filter(prompt => prompt.isHidden);
      }
    } else {
      // Hide hidden prompts from all other views
      filtered = filtered.filter(prompt => !prompt.isHidden);
      
      if (selectedTag !== 'all') {
        filtered = filtered.filter(prompt => prompt.tags.includes(selectedTag));
      }
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
    if (tag === 'hidden' && !isHiddenUnlocked) {
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
      selectedTag = tag;
      if (tag !== 'hidden') {
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
    if (selectedTag === 'hidden') {
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
            on:click={() => handleTagFilter('hidden')} 
            class="w-full text-left hover:underline {selectedTag === 'hidden' ? 'font-bold text-blue-600' : ''}"
          >
            {#if isHiddenUnlocked && selectedTag === 'hidden'}
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
          {:else if selectedTag === 'hidden'}
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
        <CreatePromptForm defaultHidden={selectedTag === 'hidden' && isHiddenUnlocked} on:created={handlePromptCreated} />
      </div>
    </div>
  {/if}
</main>
