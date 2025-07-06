<script lang="ts">
  import { onMount } from 'svelte';
  import { storage, type Prompt } from '../storage';
  import PromptCard from './PromptCard.svelte';

  export let searchQuery: string = '';
  let prompts: Prompt[] = [];

  let filteredPrompts: Prompt[] = [];

  $: filteredPrompts = searchQuery 
    ? prompts.filter(prompt => 
        prompt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prompt.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : prompts;

  onMount(async () => {
    try {
      await storage.init();
      prompts = await storage.getAllPrompts();
    } catch (error) {
      console.error('Failed to load prompts:', error);
    }
  });


  async function handlePromptUpdate() {
    prompts = await storage.getAllPrompts();
  }
</script>

<div>
  <div>
    {#if filteredPrompts.length === 0}
      <div class="text-center py-12">
        <p class="text-gray-500 text-lg">
          {searchQuery ? 'No prompts found matching your search.' : 'No prompts yet. Create your first prompt!'}
        </p>
      </div>
    {:else}
      <div class="grid gap-4">
        {#each filteredPrompts as prompt (prompt.id)}
          <PromptCard {prompt} on:update={handlePromptUpdate} />
        {/each}
      </div>
    {/if}
  </div>
</div>