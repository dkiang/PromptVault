<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { storage } from '../storage';
  import { config } from '../config';
  import { getAIService, AIService } from '../ai';
  import TagSuggestions from './TagSuggestions.svelte';

  export let defaultHidden: boolean = false;
  export let allTags: string[] = [];

  const dispatch = createEventDispatcher();

  let content = '';
  let tags = '';
  let isHidden = defaultHidden;
  let isSubmitting = false;
  let tagSuggestions: string[] = [];
  let isGeneratingSuggestions = false;
  let suggestionTimeout: number | null = null;
  let aiService: AIService | null = null;

  onMount(() => {
    aiService = getAIService();
  });

  // Debounced function to generate tag suggestions
  async function generateTagSuggestions() {
    if (!aiService || !aiService.isAIAvailable() || !content.trim() || content.length < 10) {
      tagSuggestions = [];
      return;
    }

    // Clear existing timeout
    if (suggestionTimeout) {
      clearTimeout(suggestionTimeout);
    }

    // Set new timeout for debouncing
    suggestionTimeout = setTimeout(async () => {
      isGeneratingSuggestions = true;
      try {
        const currentTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        const suggestions = await aiService.suggestTags(content, currentTags, allTags);
        tagSuggestions = suggestions.filter(suggestion => !currentTags.includes(suggestion));
      } catch (error) {
        console.error('Failed to generate tag suggestions:', error);
        tagSuggestions = [];
      } finally {
        isGeneratingSuggestions = false;
      }
    }, 1000); // Wait 1 second after user stops typing
  }

  // Watch for content changes to trigger suggestions
  $: if (content) {
    generateTagSuggestions();
  }

  function addSuggestionToTags(suggestion: string) {
    // Split tags, trim, and filter out empty
    let currentTags = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    // Only add if not already present
    if (!currentTags.includes(suggestion)) {
      // If tags is empty or ends with a comma/space, just append
      if (!tags.trim() || /[,\s]$/.test(tags)) {
        tags = tags + suggestion + ', ';
      } else {
        tags = tags + ', ' + suggestion + ', ';
      }
      // Remove duplicate commas/spaces
      tags = tags.replace(/,+/g, ',').replace(/,\s*,/g, ', ').replace(/\s+,/g, ',').replace(/,\s*$/, ', ');
    }
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    if (!content.trim()) {
      return;
    }

    isSubmitting = true;
    
    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      await storage.savePrompt({
        content: content.trim(),
        tags: tagArray,
        isHidden
      });
      
      content = '';
      tags = '';
      isHidden = defaultHidden;
      tagSuggestions = [];
      
      dispatch('created');
    } catch (error) {
      console.error('Failed to create prompt:', error);
    } finally {
      isSubmitting = false;
    }
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
  <h2 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Prompt</h2>
  
  <form on:submit={handleSubmit} class="space-y-4">
    <div>
      <label for="content" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Content
      </label>
      <textarea
        id="content"
        bind:value={content}
        required
        rows="4"
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[6rem]"
        placeholder="Enter your prompt here..."
      ></textarea>
    </div>
    
    <div>
      <label for="tags" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Tags (comma-separated)
      </label>
      <input
        id="tags"
        type="text"
        bind:value={tags}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder="writing, creative, technical..."
      />
      
      <!-- AI Tag Suggestions -->
      <TagSuggestions 
        suggestions={tagSuggestions}
        selectedTags={tags.split(',').map(tag => tag.trim()).filter(tag => tag)}
        isLoading={isGeneratingSuggestions}
        on:addTag={(event) => addSuggestionToTags(event.detail)}
      />
    </div>
    
    {#if config.isHiddenPromptsEnabled()}
      <div class="flex items-center">
        <input
          id="isHidden"
          type="checkbox"
          bind:checked={isHidden}
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label for="isHidden" class="ml-2 block text-sm text-gray-700 dark:text-gray-300">
          Mark as hidden (password protected)
        </label>
      </div>
    {/if}
    
    <div class="flex justify-end">
      <button
        type="submit"
        disabled={isSubmitting || !content.trim()}
        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed min-h-[44px] touch-manipulation"
      >
        {isSubmitting ? 'Creating...' : 'Create Prompt'}
      </button>
    </div>
  </form>
</div>