import { writable } from 'svelte/store';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const currentUser = writable<User | null>(null);

// Initialize from existing session and subscribe to future auth changes.
// SSR guard: only run in browser.
if (typeof window !== 'undefined' && supabase) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    currentUser.set(session?.user ?? null);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser.set(session?.user ?? null);
  });
}

export async function signIn(email: string): Promise<void> {
  if (typeof window === 'undefined' || !supabase) {
    throw new Error('Supabase not available');
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + '/promptvault'
    }
  });

  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (typeof window === 'undefined' || !supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
