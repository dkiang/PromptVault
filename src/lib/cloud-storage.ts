import { storage } from './storage';
import { supabaseStorage } from './supabase-storage';
import { currentUser } from './auth';
import { get } from 'svelte/store';
import type { Prompt } from './storage';

function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return get(currentUser) !== null;
}

export const dataStore = {
  getAllPrompts: (): Promise<Prompt[]> =>
    isAuthenticated() ? supabaseStorage.getAllPrompts() : storage.getAllPrompts(),

  savePrompt: (
    prompt: Parameters<typeof storage.savePrompt>[0]
  ): Promise<Prompt> =>
    isAuthenticated() ? supabaseStorage.savePrompt(prompt) : storage.savePrompt(prompt),

  updatePrompt: (
    id: string,
    updates: Parameters<typeof storage.updatePrompt>[1]
  ): Promise<Prompt | null> =>
    isAuthenticated()
      ? supabaseStorage.updatePrompt(id, updates)
      : storage.updatePrompt(id, updates),

  deletePrompt: (id: string): Promise<void> =>
    isAuthenticated() ? supabaseStorage.deletePrompt(id) : storage.deletePrompt(id),

  searchPrompts: (query: string): Promise<Prompt[]> =>
    isAuthenticated()
      ? supabaseStorage.searchPrompts(query)
      : storage.searchPrompts(query),

  exportPrompts: (): Promise<string> =>
    isAuthenticated() ? supabaseStorage.exportPrompts() : storage.exportPrompts(),

  importPrompts: (data: string): Promise<void> =>
    isAuthenticated() ? supabaseStorage.importPrompts(data) : storage.importPrompts(data),

  // Password management always uses local IndexedDB — intentionally not synced
  getHiddenPassword: (): Promise<string> => storage.getHiddenPassword(),
  setHiddenPassword: (pw: string): Promise<void> => storage.setHiddenPassword(pw),
  resetHiddenPassword: (): Promise<void> => storage.resetHiddenPassword(),

  deleteAllHiddenPrompts: (): Promise<void> =>
    isAuthenticated()
      ? supabaseStorage.deleteAllHiddenPrompts()
      : storage.deleteAllHiddenPrompts(),
};
