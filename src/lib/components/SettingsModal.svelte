<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { getAIService, AIService } from '../ai';
  // Import PasswordManager logic inline (not as a component)
  import { config } from '../config';
  import ExportImport from './ExportImport.svelte';

  export let show = false;
  export let isHiddenEnabled = false;
  const dispatch = createEventDispatcher();

  // AI Settings
  let aiService: AIService | null = null;
  let apiKey = '';
  let showKey = false;
  let isSaving = false;
  let aiMessage = '';
  let aiMessageType: 'success' | 'error' = 'success';
  let aiStatus = false;
  let keySaved = false;
  let isValidatingKey = false;

  // Password Manager
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let passwordMessage = '';
  let passwordMessageType: 'success' | 'error' = 'success';

  onMount(() => {
    aiService = getAIService();
    aiStatus = aiService && aiService.isAIAvailable();
    keySaved = aiStatus;
    apiKey = keySaved ? '••••••••••••••••' : '';
  });

  async function saveAPIKey() {
    if (!apiKey.trim() || !aiService) {
      showAIMessage('Please enter an API key', 'error');
      return;
    }
    isSaving = true;
    isValidatingKey = true;
    try {
      aiService.setAPIKey(apiKey.trim());
      // Validate the key with a minimal OpenAI API call
      const valid = await validateOpenAIKey(apiKey.trim());
      aiStatus = valid;
      keySaved = valid;
      if (valid) {
        apiKey = '••••••••••••••••';
        showAIMessage('API key saved and validated!', 'success');
      } else {
        aiService.clearAPIKey();
        showAIMessage('Invalid API key. Please check and try again.', 'error');
      }
    } catch (error) {
      aiService.clearAPIKey();
      aiStatus = false;
      keySaved = false;
      showAIMessage('Failed to validate API key', 'error');
    } finally {
      isSaving = false;
      isValidatingKey = false;
    }
  }

  async function validateOpenAIKey(key: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`
        }
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  function clearAPIKey() {
    if (aiService) {
      aiService.clearAPIKey();
      aiStatus = false;
      keySaved = false;
    }
    apiKey = '';
    showKey = false;
    showAIMessage('API key cleared', 'success');
  }

  function showAIMessage(text: string, type: 'success' | 'error') {
    aiMessage = text;
    aiMessageType = type;
    setTimeout(() => { aiMessage = ''; }, 3000);
  }

  // Password management logic (only if isHiddenEnabled)
  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showPasswordMessage('All fields are required', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showPasswordMessage('Passwords do not match', 'error');
      return;
    }
    try {
      const ok = await config.changeHiddenPassword(currentPassword, newPassword);
      if (ok) {
        showPasswordMessage('Password changed successfully!', 'success');
        currentPassword = newPassword = confirmPassword = '';
      } else {
        showPasswordMessage('Incorrect current password', 'error');
      }
    } catch (e) {
      showPasswordMessage('Failed to change password', 'error');
    }
  }
  async function resetPassword() {
    if (!confirm('This will delete all hidden prompts. Continue?')) return;
    try {
      await config.resetHiddenPassword();
      showPasswordMessage('Password reset. All hidden prompts deleted.', 'success');
      currentPassword = newPassword = confirmPassword = '';
    } catch (e) {
      showPasswordMessage('Failed to reset password', 'error');
    }
  }
  function showPasswordMessage(text: string, type: 'success' | 'error') {
    passwordMessage = text;
    passwordMessageType = type;
    setTimeout(() => { passwordMessage = ''; }, 3000);
  }
</script>

{#if show}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
    <div class="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded shadow max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Settings</h2>
        <button on:click={() => dispatch('close')} class="text-gray-500 hover:text-gray-700">✕</button>
      </div>
      <div class="space-y-8">
        <!-- AI Features -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">🤖 AI Features</h3>
          <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">Enable AI-powered tag suggestions by adding your OpenAI API key.</p>
          <div class="space-y-3">
            <div>
              <label for="apiKey" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">OpenAI API Key</label>
              <div class="relative">
                <input
                  id="apiKey"
                  type={keySaved ? 'password' : (showKey ? 'text' : 'password')}
                  bind:value={apiKey}
                  placeholder="sk-..."
                  class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  readonly={keySaved}
                />
                {#if !keySaved}
                  <button
                    type="button"
                    on:click={() => showKey = !showKey}
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showKey ? '🙈' : '👁️'}
                  </button>
                {/if}
              </div>
            </div>
            <div class="flex gap-2">
              {#if !keySaved}
                <button
                  on:click={saveAPIKey}
                  disabled={isSaving || !apiKey.trim() || !aiService}
                  class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Key'}
                </button>
              {/if}
              {#if keySaved}
                <button
                  on:click={clearAPIKey}
                  class="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Clear Key
                </button>
              {/if}
            </div>
            {#if aiMessage}
              <div class="text-xs {aiMessageType === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">{aiMessage}</div>
            {/if}
            <div class="text-xs text-gray-500 dark:text-gray-400">
              <p class="mb-1">
                <strong>Status:</strong>
                {#if isValidatingKey}
                  <span class="text-blue-600 dark:text-blue-400 font-bold">Validating...</span>
                {:else if aiService && aiService.isAIAvailable() && aiStatus}
                  <span class="text-green-600 dark:text-green-400 font-bold">✅ AI features enabled</span>
                {:else}
                  <span class="text-red-600 dark:text-red-400 font-bold">❌ AI features disabled</span>
                {/if}
              </p>
              <p>Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">OpenAI Platform</a></p>
            </div>
          </div>
        </div>
        <!-- Data Management -->
        <div>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📤 Data Management</h3>
          <ExportImport />
        </div>
        <!-- Password Management (if enabled) -->
        {#if isHiddenEnabled}
        <div>
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">🔒 Change Hidden Prompt Password</h3>
          <div class="space-y-2">
            <input type="password" placeholder="Current password" bind:value={currentPassword} class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" />
            <input type="password" placeholder="New password" bind:value={newPassword} class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" />
            <input type="password" placeholder="Confirm new password" bind:value={confirmPassword} class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md" />
            <div class="flex gap-2">
              <button on:click={changePassword} class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">Change Password</button>
              <button on:click={resetPassword} class="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">Reset & Delete All Hidden</button>
            </div>
            {#if passwordMessage}
              <div class="text-xs {passwordMessageType === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">{passwordMessage}</div>
            {/if}
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-2">Resetting your password will delete all hidden prompts. This cannot be undone.</div>
          </div>
        </div>
        {/if}
      </div>
    </div>
  </div>
{/if} 