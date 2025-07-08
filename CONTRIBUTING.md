# Guidelines for External Tools Working on This SvelteKit App

This document outlines rules for safely editing this SvelteKit project using external tools (e.g. Claude, Copilot, Replit) without breaking the local or production setup.

---

## ✅ DOs

### 1. Update `package.json` for new dependencies
- If a new package is required, **only update `package.json` and `package-lock.json`**.
- Do **not** install packages (`npm install`) or run platform-specific builds.

### 2. Respect SvelteKit version and structure
- This project uses **SvelteKit 2.22.x**.
- Use the `@sveltejs/adapter-node` adapter.
- Do not modify:
  - `.svelte-kit/`
  - `build/`
  - `static/`
- Do not remove or rename files like `index.mjs`.

### 3. Use base path setting correctly
- If modifying `svelte.config.js`, **preserve**:

```js
kit: {
  adapter: adapter(),
  paths: {
    base: '/promptvault'
  }
}
```

### 4. Keep changes modular and transparent
- Make atomic commits.
- Comment significant changes or provide manual testing instructions.

---

## ❌ DO NOT

### Never run the following:
```bash
rm -rf node_modules
npm install
npx tsc
npx svelte-check
```

### Never:
- Trigger builds or tests in external environments.
- Install platform-specific binaries.
- Rename or remove build entry files (`index.mjs`, `server`, `client` folders).

---

## 🔁 Local Developer Build Instructions (for reference only)

Only the local maintainer should run:

```bash
npm install           # Install dependencies (local machine only)
npm run build         # → vite build && svelte-kit build
npm run preview       # Local preview server
```

---

For questions, open an issue or contact the project maintainer.