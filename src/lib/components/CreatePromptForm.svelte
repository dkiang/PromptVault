<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { storage } from '../storage';

  const dispatch = createEventDispatcher();

  let title = '';
  let content = '';
  let tags = '';
  let isHidden = false;
  let isSubmitting = false;

  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      return;
    }

    isSubmitting = true;
    
    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await storage.savePrompt({
        title: title.trim(),
        content: content.trim(),
        tags: tagArray,
        isHidden
      });
      
      title = '';
      content = '';
      tags = '';
      isHidden = false;
      
      dispatch('created');
    } catch (error) {
      console.error('Failed to create prompt:', error);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="bg-white rounded-lg shadow-md border border-gray-200 p-6">
  <h2 class="text-xl font-semibold text-gray-900 mb-4">Create New Prompt</h2>
  
  <form on:submit={handleSubmit} class="space-y-4">
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700 mb-1">
        Title
      </label>
      <input
        id="title"
        type="text"
        bind:value={title}
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="Enter prompt title"
      />
    </div>
    
    <div>
      <label for="content" class="block text-sm font-medium text-gray-700 mb-1">
        Content
      </label>
      <textarea
        id="content"
        bind:value={content}
        required
        rows="6"
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        placeholder="Enter your prompt here..."
      ></textarea>
    </div>
    
    <div>
      <label for="tags" class="block text-sm font-medium text-gray-700 mb-1">
        Tags (comma-separated)
      </label>
      <input
        id="tags"
        type="text"
        bind:value={tags}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="writing, creative, technical..."
      />
    </div>
    
    <div class="flex items-center">
      <input
        id="isHidden"
        type="checkbox"
        bind:checked={isHidden}
        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      <label for="isHidden" class="ml-2 block text-sm text-gray-700">
        Mark as hidden (password protected)
      </label>
    </div>
    
    <div class="flex justify-end">
      <button
        type="submit"
        disabled={isSubmitting || !title.trim() || !content.trim()}
        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Creating...' : 'Create Prompt'}
      </button>
    </div>
  </form>
</div>