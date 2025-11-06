import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
	// Note: base path is handled by svelte.config.js via BASE_PATH env var
});