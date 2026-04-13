import { writable } from 'svelte/store';

function createOnlineStore() {
  const initial = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const { subscribe, set } = writable(initial);

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => set(true));
    window.addEventListener('offline', () => set(false));
  }

  return { subscribe };
}

export const isOnline = createOnlineStore();
