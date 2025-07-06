<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import CreatePromptForm from '$lib/components/CreatePromptForm.svelte';
  import SearchBar from '$lib/components/SearchBar.svelte';
  import PromptList from '$lib/components/PromptList.svelte';

  let searchQuery = '';

  function handleSearch(event: CustomEvent<string>) {
    searchQuery = event.detail;
  }
</script>

<svelte:head>
  <title>PromptVault - Your Personal Prompt Manager</title>
  <meta name="description" content="A lightweight, web-based prompt manager for saving and organizing AI prompts" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <Header />
  
  <main class="py-8">
    <div class="max-w-4xl mx-auto px-4 space-y-8">
      <CreatePromptForm />
      
      <SearchBar on:search={handleSearch} bind:value={searchQuery} />
      
      <PromptList {searchQuery} />
    </div>
  </main>
</div>
