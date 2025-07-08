<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { storage, type Prompt } from '../storage';
  import { config } from '../config';
  import TagList from './TagList.svelte';

  export let prompt: Prompt;
  export let searchQuery: string = '';

  const dispatch = createEventDispatcher();

  let showFullContent = false;
  let isEditing = false;
  let editContent = prompt.content;
  let editTags = prompt.tags.join(', ');
  let editIsHidden = prompt.isHidden;

  $: truncatedContent = prompt.content.length > 150 
    ? prompt.content.substring(0, 150) + '...'
    : prompt.content;

  function highlightSearchTerms(text: string, query: string): string {
    if (!query.trim()) return text;
    
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    let highlightedText = text;
    
    searchTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100">$1</mark>');
    });
    
    return highlightedText;
  }

  $: highlightedContent = showFullContent 
    ? highlightSearchTerms(prompt.content, searchQuery)
    : highlightSearchTerms(truncatedContent, searchQuery);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(prompt.content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  async function deletePrompt() {
    if (confirm('Are you sure you want to delete this prompt?')) {
      try {
        await storage.deletePrompt(prompt.id);
        dispatch('update');
      } catch (error) {
        console.error('Failed to delete prompt:', error);
      }
    }
  }

  async function saveEdit() {
    try {
      const tags = editTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      await storage.updatePrompt(prompt.id, {
        content: editContent,
        tags,
        isHidden: editIsHidden
      });
      isEditing = false;
      dispatch('update');
    } catch (error) {
      console.error('Failed to update prompt:', error);
    }
  }

  function cancelEdit() {
    isEditing = false;
    editContent = prompt.content;
    editTags = prompt.tags.join(', ');
    editIsHidden = prompt.isHidden;
  }

  async function openInChatGPT() {
    const encodedPrompt = encodeURIComponent(prompt.content);
    // Use 'prompt' parameter to pre-fill without submitting
    const chatGPTUrl = `https://chat.openai.com/?prompt=${encodedPrompt}`;
    window.open(chatGPTUrl, '_blank');
  }

  async function openInPerplexity() {
    const encodedPrompt = encodeURIComponent(prompt.content);
    // Use 'q' parameter but with a method that doesn't auto-submit
    const perplexityUrl = `https://www.perplexity.ai/?q=${encodedPrompt}&focus=internet`;
    window.open(perplexityUrl, '_blank');
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6 hover:shadow-lg transition-shadow">
  <!-- Chatbot Links -->
  <div class="mb-4 text-sm flex flex-wrap items-center gap-1">
    <span class="text-gray-600 dark:text-gray-400">Open in: </span>
    <button
      on:click={openInChatGPT}
      class="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-1 font-inherit touch-manipulation"
    >
      ChatGPT
    </button>
    <span class="text-gray-600 dark:text-gray-400"> | </span>
    <button
      on:click={openInPerplexity}
      class="text-blue-600 hover:text-blue-800 underline cursor-pointer bg-transparent border-none p-1 font-inherit touch-manipulation"
    >
      Perplexity
    </button>
  </div>
  {#if isEditing}
    <div class="space-y-4">
      <textarea
        bind:value={editContent}
        rows="4"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[6rem]"
        placeholder="Enter your prompt here..."
      ></textarea>
      
      <input
        bind:value={editTags}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Tags (comma-separated)"
      />
      
      {#if config.isHiddenPromptsEnabled()}
        <div class="flex items-center">
          <input
            id="editIsHidden"
            type="checkbox"
            bind:checked={editIsHidden}
            class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label for="editIsHidden" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Mark as hidden (password protected)
          </label>
        </div>
      {/if}
      
      <div class="flex gap-2 flex-wrap">
        <button
          on:click={saveEdit}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
        >
          Save
        </button>
        <button
          on:click={cancelEdit}
          class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 min-h-[44px] touch-manipulation"
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <div class="space-y-4">
      <div class="flex items-center justify-end">
        {#if prompt.isHidden}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Hidden
          </span>
        {/if}
      </div>
      
      <div class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
        {@html highlightedContent}
        
        {#if prompt.content.length > 150}
          <button
            on:click={() => showFullContent = !showFullContent}
            class="text-blue-600 hover:text-blue-800 text-sm ml-2"
          >
            {showFullContent ? 'Show less' : 'Show more'}
          </button>
        {/if}
      </div>
      
      {#if prompt.tags.length > 0}
        <TagList tags={prompt.tags} {searchQuery} />
      {/if}
      
      <div class="flex items-center justify-end text-sm text-gray-500">
        <div class="flex gap-2 flex-wrap">
          <button
            on:click={copyToClipboard}
            class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
          >
            Copy
          </button>
          <button
            on:click={() => isEditing = true}
            class="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[44px] touch-manipulation"
          >
            Edit
          </button>
          <button
            on:click={deletePrompt}
            class="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px] touch-manipulation"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>