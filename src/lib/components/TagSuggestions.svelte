<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let suggestions: string[] = [];
  export let selectedTags: string[] = [];
  export let isLoading: boolean = false;

  const dispatch = createEventDispatcher<{ addTag: string }>();

  function addTag(tag: string) {
    if (!selectedTags.includes(tag)) {
      dispatch('addTag', tag);
    }
  }

  function isTagSelected(tag: string): boolean {
    return selectedTags.includes(tag);
  }
</script>

{#if suggestions.length > 0 || isLoading}
  <div class="mt-3">
    <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
      🤖 AI Tag Suggestions
    </h4>
    
    {#if isLoading}
      <div class="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Generating suggestions...</span>
      </div>
    {:else}
      <div class="flex flex-wrap gap-2">
        {#each suggestions as tag}
          <button
            type="button"
            on:click={() => addTag(tag)}
            class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors {isTagSelected(tag) 
              ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 cursor-default' 
              : 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-700 cursor-pointer'}"
            disabled={isTagSelected(tag)}
          >
            {tag}
            {#if isTagSelected(tag)}
              <span class="ml-1">✓</span>
            {/if}
          </button>
        {/each}
      </div>
      
      {#if suggestions.length === 0}
        <p class="text-sm text-gray-500 dark:text-gray-400">
          No suggestions available. Try adding more content to your prompt.
        </p>
      {/if}
    {/if}
  </div>
{/if} 