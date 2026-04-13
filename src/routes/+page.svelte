<script lang="ts">
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { dataStore as storage } from '$lib/cloud-storage';
  import { storage as idbStorage } from '$lib/storage';
  import { supabaseStorage } from '$lib/supabase-storage';
  import { config } from '$lib/config';
  import { currentUser, signIn, signOut } from '$lib/auth';
  import type { User } from '@supabase/supabase-js';
  import { isOnline } from '$lib/connectivity';
  import PromptCard from '$lib/components/PromptCard.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import CreatePromptForm from '$lib/components/CreatePromptForm.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';

  import type { Prompt } from '$lib/storage';

  const darkMode = writable(false);
  const modalOpen = writable(false);
  const sidebarOpen = writable(false);

  let isDesktop = false;

  let prompts: Prompt[] = [];
  let filteredPrompts: Prompt[] = [];
  let searchQuery = '';
  let selectedTag = 'all';
  let allTags: string[] = [];
  let isHiddenUnlocked = false;
  let hiddenPassword = 'foobar';
  let showAboutModal = false;
  let showSettingsModal = false;

  // Auth state
  let showSignInModal = false;
  let signInEmail = '';
  let signInSent = false;
  let signInLoading = false;
  let signInError = '';

  // Migration state
  let showMigrationModal = false;
  let migrationPromptCount = 0;
  let migrationLoading = false;

  // Orphaned-prompts modal (second-device scenario)
  let showOrphanModal = false;
  let orphanPrompts: Prompt[] = [];

  $: isAuthenticated = $currentUser !== null;
  $: isOfflineAuthenticated = !$isOnline && isAuthenticated;

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
    const isInHiddenMode =
      (selectedTag === 'Hidden' && isHiddenUnlocked) ||
      (selectedTag !== 'all' && selectedTag !== 'Hidden' && isHiddenUnlocked);

    prompts.forEach(prompt => {
      if (isInHiddenMode) {
        if (prompt.isHidden) prompt.tags.forEach(tag => tagSet.add(tag));
      } else {
        if (!prompt.isHidden) prompt.tags.forEach(tag => tagSet.add(tag));
      }
    });
    allTags = Array.from(tagSet).sort() as string[];
  }

  function updateFilteredPrompts() {
    let filtered = prompts;
    const isInHiddenMode =
      (selectedTag === 'Hidden' && isHiddenUnlocked) ||
      (selectedTag !== 'all' && selectedTag !== 'Hidden' && isHiddenUnlocked);

    if (isInHiddenMode) {
      filtered = isHiddenUnlocked ? filtered.filter(p => p.isHidden) : [];
    } else {
      filtered = filtered.filter(p => !p.isHidden);
    }

    if (selectedTag !== 'all' && selectedTag !== 'Hidden') {
      filtered = filtered.filter(p => p.tags.includes(selectedTag));
    }

    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(' ').filter(t => t.length > 0);
      filtered = filtered.filter(p => {
        const text = (p.content + ' ' + p.tags.join(' ')).toLowerCase();
        return searchTerms.every(t => text.includes(t));
      });
    }

    filteredPrompts = filtered;
  }

  function handleSearch(event: CustomEvent<string>) {
    searchQuery = event.detail;
    updateFilteredPrompts();
    if (!isDesktop) closeSidebar();
  }

  function handleTagFilter(tag: string) {
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
      const isCurrentlyInHiddenMode =
        (selectedTag === 'Hidden' && isHiddenUnlocked) ||
        (selectedTag !== 'all' && selectedTag !== 'Hidden' && isHiddenUnlocked);
      selectedTag = tag;
      if (tag !== 'Hidden' && !isCurrentlyInHiddenMode) {
        isHiddenUnlocked = false;
      }
    }

    if (!isDesktop) closeSidebar();
    extractTags();
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
    if (selectedTag === 'Hidden') selectedTag = 'all';
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  async function handleSignIn() {
    if (!signInEmail.trim()) return;
    signInLoading = true;
    signInError = '';
    try {
      await signIn(signInEmail.trim());
      signInSent = true;
    } catch {
      signInError = 'Failed to send magic link. Please try again.';
    } finally {
      signInLoading = false;
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      await loadPrompts();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  function openSignInModal() {
    signInEmail = '';
    signInSent = false;
    signInError = '';
    showSignInModal = true;
  }

  // ── Migration ─────────────────────────────────────────────────────────────

  async function checkMigration() {
    try {
      const cloudCount = await supabaseStorage.getPromptCount();

      if (cloudCount === 0) {
        // No cloud data — check for local prompts to migrate
        const localPrompts = await idbStorage.getAllPrompts();
        if (localPrompts.length > 0) {
          migrationPromptCount = localPrompts.length;
          showMigrationModal = true;
        }
      } else {
        // Cloud has data — check for orphaned local prompts (second-device scenario)
        const localPrompts = await idbStorage.getAllPrompts();
        if (localPrompts.length > 0) {
          const cloudPrompts = await supabaseStorage.getAllPrompts();
          const cloudIds = new Set(cloudPrompts.map(p => p.id));
          const orphaned = localPrompts.filter(p => !cloudIds.has(p.id));
          if (orphaned.length > 0) {
            orphanPrompts = orphaned;
            showOrphanModal = true;
          }
        }
      }
    } catch (error) {
      console.error('Migration check failed:', error);
    }
  }

  async function handleMigrationUpload() {
    migrationLoading = true;
    try {
      const localPrompts = await idbStorage.getAllPrompts();
      const uploaded = await supabaseStorage.upsertPrompts(localPrompts);
      showMigrationModal = false;
      await loadPrompts();
      alert(`Migration complete — ${uploaded} prompt${uploaded === 1 ? '' : 's'} now available on all your devices.`);
    } catch (error) {
      console.error('Migration failed:', error);
      alert('Migration failed. Please try again.');
    } finally {
      migrationLoading = false;
    }
  }

  function handleMigrationSkip() {
    showMigrationModal = false;
  }

  async function handleOrphanUpload() {
    try {
      await supabaseStorage.upsertPrompts(orphanPrompts);
      showOrphanModal = false;
      await loadPrompts();
    } catch (error) {
      console.error('Orphan upload failed:', error);
    }
  }

  function handleOrphanDiscard() {
    showOrphanModal = false;
  }

  function handleOrphanLater() {
    showOrphanModal = false;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  onMount(() => {
    isDesktop = window.innerWidth >= 1024;

    const handleResize = () => {
      isDesktop = window.innerWidth >= 1024;
    };
    window.addEventListener('resize', handleResize);

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showSignInModal) {
          showSignInModal = false;
        } else if (showMigrationModal) {
          // don't dismiss migration on Escape
        } else if ($modalOpen) {
          modalOpen.set(false);
        } else if (showAboutModal) {
          showAboutModal = false;
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
      if (isDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      darkMode.set(true);
      document.documentElement.classList.add('dark');
    }

    loadPrompts();
    loadPassword();

    // Watch auth state: reload prompts and check migration when user signs in/out
    let previousUser: User | null = null;
    const unsubscribeAuth = currentUser.subscribe(async user => {
      const justSignedIn = previousUser === null && user !== null;
      const justSignedOut = previousUser !== null && user === null;
      previousUser = user;

      if (user !== null) {
        await loadPrompts();
        if (justSignedIn) await checkMigration();
      } else if (justSignedOut) {
        await loadPrompts();
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeydown);
      unsubscribeAuth();
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

    <!-- Settings & Auth -->
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

      <!-- Auth controls -->
      {#if $currentUser}
        <div class="pt-1 space-y-1">
          <div class="text-sm text-gray-600 dark:text-gray-400 truncate" title={$currentUser.email}>
            {$isOnline ? '✅' : '⚡'} {$currentUser.email}
          </div>
          <button
            on:click={handleSignOut}
            class="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
          >
            Sign Out
          </button>
        </div>
      {:else}
        <button
          on:click={openSignInModal}
          class="block text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          🔑 Sign In
        </button>
      {/if}
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
      <div class="flex items-center gap-3">
        {#if $currentUser}
          <span
            class="text-sm"
            title={$isOnline ? 'Connected to cloud' : "You're offline"}
          >
            {$isOnline ? '🟢' : '🔴'}
          </span>
        {/if}
        <button
          on:click={() => !isOfflineAuthenticated && modalOpen.set(true)}
          disabled={isOfflineAuthenticated}
          title={isOfflineAuthenticated ? "You're offline — changes can't be saved right now" : undefined}
          class="bg-green-600 text-white px-4 py-2 lg:px-6 lg:py-3 text-base lg:text-lg font-medium rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
        >
          + New Prompt
        </button>
      </div>
    </header>

    <!-- Offline banner (authenticated + offline) -->
    {#if $currentUser && !$isOnline}
      <div class="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md text-amber-800 dark:text-amber-200 text-sm">
        ⚡ You're offline. Viewing cached prompts. Editing is disabled until you reconnect.
      </div>
    {/if}

    <div class="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {#each filteredPrompts as p (p.id)}
        <PromptCard prompt={p} {searchQuery} allTags={allTags} on:update={handlePromptUpdated} />
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

  <!-- New Prompt Modal -->
  {#if $modalOpen}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div class="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded shadow max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">New Prompt</h2>
          <button on:click={() => modalOpen.set(false)} class="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <CreatePromptForm defaultHidden={selectedTag === 'Hidden' && isHiddenUnlocked} allTags={allTags} on:created={handlePromptCreated} />
      </div>
    </div>
  {/if}

  <!-- Sign In Modal -->
  {#if showSignInModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div class="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-sm w-full">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-bold">🔑 Sign In</h2>
          <button on:click={() => showSignInModal = false} class="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        {#if signInSent}
          <p class="text-gray-700 dark:text-gray-300 text-sm">
            Check your email for a magic link. Click it to sign in — you'll be redirected back automatically.
          </p>
          <button
            on:click={() => { signInSent = false; }}
            class="mt-4 text-xs text-blue-600 hover:underline"
          >
            Resend link
          </button>
        {:else}
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enter your email and we'll send you a magic link — no password needed.
          </p>
          <form on:submit|preventDefault={handleSignIn} class="space-y-3">
            <input
              type="email"
              bind:value={signInEmail}
              placeholder="you@example.com"
              required
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {#if signInError}
              <p class="text-xs text-red-600 dark:text-red-400">{signInError}</p>
            {/if}
            <button
              type="submit"
              disabled={signInLoading || !signInEmail.trim()}
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
            >
              {signInLoading ? 'Sending…' : 'Send Magic Link'}
            </button>
          </form>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Migration Modal -->
  {#if showMigrationModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div class="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-md w-full">
        <h2 class="text-lg font-bold mb-3">📤 Upload your prompts to the cloud?</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          You have {migrationPromptCount} prompt{migrationPromptCount === 1 ? '' : 's'} stored on this device.
          Upload them so you can access them from any device.
        </p>
        <div class="flex gap-3">
          <button
            on:click={handleMigrationUpload}
            disabled={migrationLoading}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm min-h-[44px]"
          >
            {migrationLoading ? 'Uploading…' : 'Upload'}
          </button>
          <button
            on:click={handleMigrationSkip}
            disabled={migrationLoading}
            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm min-h-[44px]"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Orphaned Prompts Modal (second-device scenario) -->
  {#if showOrphanModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div class="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-md w-full">
        <h2 class="text-lg font-bold mb-3">📱 Local prompts found</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
          You have {orphanPrompts.length} local prompt{orphanPrompts.length === 1 ? '' : 's'} on this device that aren't in your cloud library.
        </p>
        <div class="flex flex-wrap gap-3">
          <button
            on:click={handleOrphanUpload}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm min-h-[44px]"
          >
            Upload them
          </button>
          <button
            on:click={handleOrphanDiscard}
            class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm min-h-[44px]"
          >
            Discard them
          </button>
          <button
            on:click={handleOrphanLater}
            class="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm min-h-[44px]"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- About Modal -->
  {#if showAboutModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div class="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded shadow max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">About</h2>
          <button on:click={() => showAboutModal = false} class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">✕</button>
        </div>
        <div class="prose dark:prose-invert max-w-none">
          <p class="text-gray-700 dark:text-gray-300">
            <strong>PromptVault</strong> is a modern prompt management tool built by <a href="https://www.linkedin.com/in/douglas-kiang/" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">Douglas Kiang</a>. It lets you store, search, tag, and organize your AI prompts in a clean, responsive interface.
          </p>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">🚀 Key Features</h3>
          <ul class="space-y-2 text-gray-700 dark:text-gray-300">
            <li><strong>🔍 Search & Highlight</strong>: Full-text search across all prompts with keyword highlighting</li>
            <li><strong>🤖 AI Auto-Tagging</strong>: OpenAI-powered tag suggestions as you type prompts, now preferring your existing tags and matching synonyms</li>
            <li><strong>🤖 Chatbot Links</strong>: Open prompts directly in ChatGPT or Perplexity</li>
            <li><strong>🏷️ Tag System</strong>: Organize prompts with dynamic, auto-updating tags</li>
            <li><strong>🔒 Hidden Prompts</strong>: Optional password-protected prompts (DevTools activation required)</li>
            <li><strong>🌙 Dark Mode</strong>: Toggle themes with persistent preferences</li>
            <li><strong>📤 Import/Export</strong>: Backup or transfer prompts via JSON (in Settings modal)</li>
            <li><strong>☁️ Cloud Sync</strong>: Sign in with a magic link to access prompts across all your devices</li>
            <li><strong>⚙️ Settings Modal</strong>: Manage AI features, data export/import, and password options in one place</li>
            <li><strong>✨ Minimal UI</strong>: Content-only display with color-coded actions</li>
          </ul>
          <p class="text-gray-700 dark:text-gray-300 mt-6">
            For details or support, <a href="https://github.com/dkiang/PromptVault" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">visit the GitHub repo</a>.
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Settings Modal -->
  {#if showSettingsModal}
    <SettingsModal show={showSettingsModal} isHiddenEnabled={config.isHiddenPromptsEnabled()} on:close={() => showSettingsModal = false} />
  {/if}
</main>
