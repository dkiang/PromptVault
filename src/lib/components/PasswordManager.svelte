<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { storage } from '../storage';

  const dispatch = createEventDispatcher();

  let showModal = false;
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let isChangingPassword = false;
  let isResettingPassword = false;
  let errorMessage = '';
  let successMessage = '';

  async function changePassword() {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      errorMessage = 'All fields are required';
      return;
    }

    if (newPassword !== confirmPassword) {
      errorMessage = 'New passwords do not match';
      return;
    }

    if (newPassword.length < 3) {
      errorMessage = 'Password must be at least 3 characters long';
      return;
    }

    isChangingPassword = true;
    errorMessage = '';
    successMessage = '';

    try {
      const storedPassword = await storage.getHiddenPassword();
      
      if (currentPassword !== storedPassword) {
        errorMessage = 'Current password is incorrect';
        return;
      }

      await storage.setHiddenPassword(newPassword);
      successMessage = 'Password changed successfully';
      
      // Clear form
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
      
      // Close modal after a short delay
      setTimeout(() => {
        showModal = false;
        successMessage = '';
      }, 2000);
      
    } catch (error) {
      console.error('Failed to change password:', error);
      errorMessage = 'Failed to change password. Please try again.';
    } finally {
      isChangingPassword = false;
    }
  }

  async function resetPassword() {
    if (!currentPassword.trim()) {
      errorMessage = 'Current password is required';
      return;
    }

    const confirmed = confirm(
      '⚠️ WARNING: Resetting the password will permanently delete ALL hidden prompts!\n\n' +
      'This action cannot be undone. Are you sure you want to continue?'
    );

    if (!confirmed) {
      return;
    }

    isResettingPassword = true;
    errorMessage = '';
    successMessage = '';

    try {
      const storedPassword = await storage.getHiddenPassword();
      
      if (currentPassword !== storedPassword) {
        errorMessage = 'Current password is incorrect';
        return;
      }

      await storage.resetHiddenPassword();
      successMessage = 'Password reset successfully. All hidden prompts have been deleted.';
      
      // Clear form
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
      
      // Close modal after a short delay
      setTimeout(() => {
        showModal = false;
        successMessage = '';
        dispatch('passwordReset');
      }, 3000);
      
    } catch (error) {
      console.error('Failed to reset password:', error);
      errorMessage = 'Failed to reset password. Please try again.';
    } finally {
      isResettingPassword = false;
    }
  }

  function openModal() {
    showModal = true;
    errorMessage = '';
    successMessage = '';
    currentPassword = '';
    newPassword = '';
    confirmPassword = '';
  }

  function closeModal() {
    showModal = false;
    errorMessage = '';
    successMessage = '';
  }
</script>

<button
  on:click={openModal}
  class="text-sm text-gray-600 dark:text-gray-400 underline hover:text-gray-800 dark:hover:text-gray-200"
  title="Manage hidden prompt password"
>
  Password Settings
</button>

{#if showModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
    <div class="bg-white dark:bg-gray-800 p-6 rounded shadow max-w-md w-full mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold text-gray-900 dark:text-white">Password Settings</h3>
        <button on:click={closeModal} class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ✕
        </button>
      </div>
      
      <div class="space-y-4">
        <!-- Change Password Section -->
        <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h4 class="text-md font-semibold text-gray-900 dark:text-white mb-3">Change Password</h4>
          
          <div class="space-y-3">
            <div>
              <label for="currentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                bind:value={currentPassword}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter current password"
              />
            </div>
            
            <div>
              <label for="newPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                bind:value={newPassword}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter new password"
              />
            </div>
            
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                bind:value={confirmPassword}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Confirm new password"
              />
            </div>
            
            <button
              on:click={changePassword}
              disabled={isChangingPassword}
              class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChangingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>

        <!-- Reset Password Section -->
        <div class="pt-2">
          <h4 class="text-md font-semibold text-gray-900 dark:text-white mb-3">Reset Password</h4>
          
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3 mb-3">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
                  Warning: This will delete all hidden prompts
                </h3>
                <div class="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>Resetting the password will permanently delete all hidden prompts and reset the password to the default.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="space-y-3">
            <div>
              <label for="resetCurrentPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                id="resetCurrentPassword"
                type="password"
                bind:value={currentPassword}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter current password"
              />
            </div>
            
            <button
              on:click={resetPassword}
              disabled={isResettingPassword}
              class="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResettingPassword ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </div>

        <!-- Error and Success Messages -->
        {#if errorMessage}
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
            <p class="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        {/if}

        {#if successMessage}
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
            <p class="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if} 