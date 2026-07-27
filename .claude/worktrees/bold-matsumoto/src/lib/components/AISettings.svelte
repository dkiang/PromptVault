<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getAIService, AIService } from '../ai';

  const dispatch = createEventDispatcher();

  let aiService: AIService | null = null;
  let apiKey = '';
  let showKey = false;
  let isSaving = false;
  let message = '';
  let messageType: 'success' | 'error' = 'success';

  onMount(() => {
    aiService = getAIService();
    // We can't directly access the key for security, but we can check if AI is available
    apiKey = aiService && aiService.isAIAvailable() ? '••••••••••••••••' : '';
  });

  async function saveAPIKey() {
    if (!apiKey.trim() || !aiService) {
      showMessage('Please enter an API key', 'error');
      return;
    }

    isSaving = true;
    try {
      aiService.setAPIKey(apiKey.trim());
      showMessage('API key saved successfully!', 'success');
      dispatch('updated');
    } catch (error) {
      showMessage('Failed to save API key', 'error');
    } finally {
      isSaving = false;
    }
  }

  function clearAPIKey() {
    if (aiService) {
      aiService.clearAPIKey();
    }
    apiKey = '';
    showMessage('API key cleared', 'success');
    dispatch('updated');
  }

  function showMessage(text: string, type: 'success' | 'error') {
    message = text;
    messageType = type;
    setTimeout(() => {
      message = '';
    }, 3000);
  }
</script>

<div class="space-y-4">
  <div>
    <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
      🤖 AI Features Settings
    </h3>
    <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
      Enable AI-powered tag suggestions by adding your OpenAI API key.
    </p>
  </div>

  <div class="space-y-3">
    <div>
      <label for="apiKey" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
        OpenAI API Key
      </label>
      <div class="relative">
        <input
          id="apiKey"
          type={showKey ? 'text' : 'password'}
          bind:value={apiKey}
          placeholder="sk-..."
          class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          on:click={() => showKey = !showKey}
          class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
        >
          {showKey ? '🙈' : '👁️'}
        </button>
      </div>
    </div>

    <div class="flex gap-2">
      <button
        on:click={saveAPIKey}
        disabled={isSaving || !apiKey.trim() || !aiService}
        class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save Key'}
      </button>
      
      {#if aiService && aiService.isAIAvailable()}
        <button
          on:click={clearAPIKey}
          class="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Clear Key
        </button>
      {/if}
    </div>

    {#if message}
      <div class="text-xs {messageType === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
        {message}
      </div>
    {/if}

    <div class="text-xs text-gray-500 dark:text-gray-400">
      <p class="mb-1">
        <strong>Status:</strong> 
        {aiService && aiService.isAIAvailable() ? '✅ AI features enabled' : '❌ AI features disabled'}
      </p>
      <p>
        Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">OpenAI Platform</a>
      </p>
    </div>
  </div>
</div> 