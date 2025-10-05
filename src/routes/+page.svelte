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
  import AISettings from '$lib/components/AISettings.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';

  const darkMode = writable(false);
  const modalOpen = writable(false);
  const sidebarOpen = writable(false);
  
  let isDesktop = false;

  import type { Prompt } from '$lib/storage';
  
  let prompts: Prompt[] = [];
  let filteredPrompts: Prompt[] = [];
  let searchQuery = '';
  let selectedTag = 'all';
  let allTags: string[] = [];
  let isHiddenUnlocked = false;
  let hiddenPassword = 'foobar'; // Will be loaded from storage
  let showAboutModal = false;
  let showSettingsModal = false;
  let showDomainTransferWarning = false;

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

  function toggleSidebar() {
    sidebarOpen.update(v => !v);
  }

  function closeSidebar() {
    sidebarOpen.set(false);
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
    allTags = Array.from(tagSet).sort() as string[];
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
    
    // Close sidebar on mobile after search
    if (!isDesktop) {
      closeSidebar();
    }
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
    
    // Close sidebar on mobile after tag selection
    if (!isDesktop) {
      closeSidebar();
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

  function dismissDomainTransferWarning() {
    showDomainTransferWarning = false;
    localStorage.setItem('domainTransferWarningDismissed', 'true');
  }

  function openSettingsForBackup() {
    showDomainTransferWarning = false;
    showSettingsModal = true;
  }

  onMount(() => {
    // Check if desktop on mount
    isDesktop = window.innerWidth >= 1024;
    
    // Handle window resize
    const handleResize = () => {
      isDesktop = window.innerWidth >= 1024;
    };
    window.addEventListener('resize', handleResize);
    
    // Handle escape key to close modals
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if ($modalOpen) {
          modalOpen.set(false);
        } else if (showAboutModal) {
          showAboutModal = false;
        } else if (showDomainTransferWarning) {
          showDomainTransferWarning = false;
        } else if ($sidebarOpen && !isDesktop) {
          closeSidebar();
        }
      }
    };
    window.addEventListener('keydown', handleKeydown);
    
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

    // Check if domain transfer warning should be shown
    const warningDismissed = localStorage.getItem('domainTransferWarningDismissed');
    console.log('Warning dismissed status:', warningDismissed);
    if (!warningDismissed) {
      showDomainTransferWarning = true;
      console.log('Showing domain transfer warning');
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<main class="flex h-screen bg-white text-black dark:bg-gray-900 dark:text-white landscape-compact">
  <!-- Mobile Sidebar Overlay -->
  {#if $sidebarOpen}
    <div class="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" on:click={closeSidebar}></div>
  {/if}
  
  <!-- Sidebar -->
  <aside class="w-64 h-full bg-gray-100 dark:bg-gray-800 p-4 overflow-y-auto z-50 transition-transform duration-300 ease-in-out {isDesktop ? 'static lg:z-auto lg:transition-none lg:transform-none' : 'fixed left-0 top-0 z-50 ' + ($sidebarOpen ? 'translate-x-0' : '-translate-x-full')}" on:click|stopPropagation>
    <!-- All Prompts -->
    <ul class="space-y-2 mb-6">
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
    </ul>
    
    <!-- Search Bar -->
    <div class="mb-6">
      <SearchBar on:search={handleSearch} bind:value={searchQuery} />
    </div>
    
    <!-- Tags Section -->
    <div class="mb-6">
      <h2 class="text-xl font-bold mb-4">Tags</h2>
      <ul class="space-y-2">
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
    </div>
    
    <!-- Settings -->
    <div class="mb-6 space-y-2">
      <button on:click={toggleDarkMode} class="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
        {#if $darkMode}
          🌞 Light Mode
        {:else}
          🌙 Dark Mode
        {/if}
      </button>
      <button on:click={() => showSettingsModal = true} class="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
        ⚙️ Settings
      </button>
    </div>
    <div class="mt-8">
      <button on:click={() => showAboutModal = true} class="block w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-left">About this app</button>
    </div>
  </aside>

  <!-- Main Content -->
  <section class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <header class="flex justify-between items-center mb-6">
      <!-- Mobile hamburger menu -->
      <div class="flex items-center gap-4">
        <button on:click={toggleSidebar} class="lg:hidden p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
        <h1 class="text-xl sm:text-2xl font-bold">PromptVault</h1>
      </div>
      <div class="flex items-center">
        <button on:click={() => modalOpen.set(true)} class="bg-green-600 text-white px-4 py-2 lg:px-6 lg:py-3 text-base lg:text-lg font-medium rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[44px] touch-manipulation">
          + New Prompt
        </button>
      </div>
    </header>

    <div class="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {#each filteredPrompts as prompt (prompt.id)}
        <PromptCard {prompt} {searchQuery} allTags={allTags} on:update={handlePromptUpdated} />
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
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div class="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded shadow max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">New Prompt</h2>
          <button on:click={() => modalOpen.set(false)} class="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <CreatePromptForm defaultHidden={selectedTag === 'Hidden' && isHiddenUnlocked} allTags={allTags} on:created={handlePromptCreated} />
      </div>
    </div>
  {/if}

  <!-- About Modal -->
  {#if showAboutModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div class="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded shadow max-w-2xl w-full max-h-[80vh] overflow-y-auto">
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
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">�� Key Features</h3>
          <ul class="space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>🔍 Search & Highlight</strong>: Full-text search across all prompts with keyword highlighting</li>
            <li><strong>🤖 AI Auto-Tagging</strong>: OpenAI-powered tag suggestions as you type prompts, now preferring your existing tags and matching synonyms</li>
            <li><strong>🤖 Chatbot Links</strong>: Open prompts directly in ChatGPT or Perplexity</li>
            <li><strong>🏷️ Tag System</strong>: Organize prompts with dynamic, auto-updating tags</li>
            <li><strong>🔒 Hidden Prompts</strong>: Optional password-protected prompts (DevTools activation required)</li>
            <li><strong>🌙 Dark Mode</strong>: Toggle themes with persistent preferences</li>
            <li><strong>📤 Import/Export</strong>: Backup or transfer prompts via JSON (in Settings modal)</li>
            <li><strong>⚙️ Settings Modal</strong>: Manage AI features, data export/import, and password options in one place</li>
            <li><strong>✨ Minimal UI</strong>: Content-only display with color-coded actions</li>
          </ul>
          <p class="text-gray-700 dark:text-gray-300 mt-6">
            This is a client-side-only app designed for personal use.<br>For details or support, <a href="https://github.com/dkiang/PromptVault" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">visit the GitHub repo</a>.
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Settings Modal -->
  {#if showSettingsModal}
    <SettingsModal show={showSettingsModal} isHiddenEnabled={config.isHiddenPromptsEnabled()} on:close={() => showSettingsModal = false} />
  {/if}

  <!-- Domain Transfer Warning Modal -->
  {#if showDomainTransferWarning}
    <div class="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[70] p-4">
      <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full">
        <div class="flex items-center mb-4">
          <div class="flex-shrink-0 w-10 h-10 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mr-3">
            <svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">⚠️ Important: Backup Your Prompts</h2>
        </div>

        <div class="mb-6">
          <p class="text-gray-700 dark:text-gray-300 mb-4">
            This site is undergoing a domain transfer on <strong>October 6th</strong>.
          </p>
          <p class="text-gray-700 dark:text-gray-300 mb-4">
            <strong>Your saved prompts may be lost</strong> because they are stored locally in your browser and are tied to this domain.
          </p>
          <p class="text-gray-700 dark:text-gray-300">
            Please backup your prompts now using the Export feature in Settings to ensure you don't lose them.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row gap-3">
          <button
            on:click={openSettingsForBackup}
            class="flex-1 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium min-h-[44px] touch-manipulation"
          >
            📤 Open Settings to Backup
          </button>
          <button
            on:click={dismissDomainTransferWarning}
            class="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md hover:bg-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 min-h-[44px] touch-manipulation"
          >
            I'll Do This Later
          </button>
        </div>
      </div>
    </div>
  {/if}
</main>
