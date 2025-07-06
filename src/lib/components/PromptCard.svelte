<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { storage, type Prompt } from '../storage';
  import TagList from './TagList.svelte';

  export let prompt: Prompt;

  const dispatch = createEventDispatcher();

  let showFullContent = false;
  let isEditing = false;
  let editTitle = prompt.title;
  let editContent = prompt.content;
  let editTags = prompt.tags.join(', ');

  $: truncatedContent = prompt.content.length > 150 
    ? prompt.content.substring(0, 150) + '...'
    : prompt.content;

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
        title: editTitle,
        content: editContent,
        tags
      });
      isEditing = false;
      dispatch('update');
    } catch (error) {
      console.error('Failed to update prompt:', error);
    }
  }

  function cancelEdit() {
    isEditing = false;
    editTitle = prompt.title;
    editContent = prompt.content;
    editTags = prompt.tags.join(', ');
  }
</script>

<div class="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow">
  {#if isEditing}
    <div class="space-y-4">
      <input
        bind:value={editTitle}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Prompt title"
      />
      
      <textarea
        bind:value={editContent}
        rows="6"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        placeholder="Enter your prompt here..."
      ></textarea>
      
      <input
        bind:value={editTags}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Tags (comma-separated)"
      />
      
      <div class="flex gap-2">
        <button
          on:click={saveEdit}
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Save
        </button>
        <button
          on:click={cancelEdit}
          class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
      </div>
    </div>
  {:else}
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">{prompt.title}</h3>
        {#if prompt.isHidden}
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Hidden
          </span>
        {/if}
      </div>
      
      <div class="text-gray-700 whitespace-pre-wrap">
        {#if showFullContent}
          {prompt.content}
        {:else}
          {truncatedContent}
        {/if}
        
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
        <TagList tags={prompt.tags} />
      {/if}
      
      <div class="flex items-center justify-between text-sm text-gray-500">
        <span>Created: {prompt.createdAt.toLocaleDateString()}</span>
        <div class="flex gap-2">
          <button
            on:click={copyToClipboard}
            class="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            Copy
          </button>
          <button
            on:click={() => isEditing = true}
            class="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Edit
          </button>
          <button
            on:click={deletePrompt}
            class="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>