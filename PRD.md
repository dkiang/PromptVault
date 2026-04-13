# Product Requirements Document (PRD)

**Date:** July 05, 2025  
**Product Name:** PromptVault  
**Owner:** Douglas Kiang

---

## 1. Overview
PromptVault is a lightweight, web-based prompt manager designed for single users who want to quickly save, browse, and reuse AI prompts across devices without requiring an account. The product prioritizes simplicity, privacy, and minimal user friction. Users can create, edit, import/export prompts, and manage everything locally on their device unless shared explicitly via file export/import.

## 2. Problem Statement
AI users frequently write prompts they wish to reuse or refine over time. Existing tools are often heavyweight, require logins, or don't support simple workflows for saving and retrieving these prompts. There is no easy way to save prompts locally, organize them by project, and sync or share them securely without creating an account or relying on cloud storage.

## 3. Goals
- Enable quick saving and browsing of prompts  
- No login or account creation required  
- One-click copy to clipboard  
- Password-protected hidden prompts  
- Export/import prompts using standard formats (e.g., JSON, Markdown)

## 4. Features

### 4.1 Must-Have (MVP)
- Create/save new prompts
- Search functionality
- Edit/update existing prompts  
- Delete prompts  
- Export prompts to Markdown or JSON  
- Import prompts from file  
- Password-protected “Hidden” prompts
- Tags for organizing prompts
  - View, Edit, Delete tags

### 4.2 Nice-to-Have (Future)
- Tags are in alphabetical order
- GPT-suggested tags
  - Suggests existing tags where possible
- Fuzzy Matching for Tag Suggestions and Auto-Completion (next feature to be implemented)
- Version history / undo changes  
- Pin/favorite frequently used prompts  
- Dark mode and theme customization

## 5. Target Users
Single-user AI practitioners such as writers, researchers, developers, and hobbyists who frequently write and reuse prompts.

## 6. Usage Scenarios
- User quickly pastes in a new text prompt and sees a list of AI suggestions for tags. User clicks to toggle relevant tags and saves it with click
- User enters a search for a given keyword and sees a list of prompts with that keyword highlighted   
- User browses their list of saved prompts and clicks one to copy it to the clipboard
- User exports their prompts before switching devices  
- User imports prompts from a file on another device  
- User marks certain prompts as Hidden and unlocks them using a password

## 7. Technical Requirements
- Built as a responsive web app (HTML/CSS/JS, or React preferred)  
- Prompts stored locally in browser storage (e.g., IndexedDB or localStorage)  
- Optional encrypted data for Hidden prompts  
- No backend required unless syncing evolves beyond peer-to-peer

## 8. UI/UX Requirements
- Minimalist interface inspired by Notion or Bear  
- List view with prompt content and tags  
- One-click to copy prompt  
- Quick access to create/edit/delete  
- Visual indicator for Hidden prompts
- Data Management (Export/Import) and AI key management available in the Settings modal

## 9. Deployment Target
The repository will be deployed using Vercel's CDN and functions architecture.

###Project Root###
The repository root MUST contain: package.json, .gitignore, and the public directory. Ignore all DS_Store files.

###Static Assets###
All public, browser-accessible files (images, CSS, fonts, root index.html) MUST be placed inside a folder named public/.

###API/Backend Code###
Server-side logic (API endpoints, form handlers, database queries) MUST be placed in a directory like api/ or within the framework's standard API route directory (e.g., pages/api or app/api in Next.js).

###Core Logic/Frontend Code###
All application-specific code and components (non-public files) should reside in a separate source folder, often src/ or the framework's designated route directories.

###Pathing and Linking Constraints###
1. Absolute Paths for Assets: All references to static assets (in HTML, CSS, or JavaScript) MUST use a root-relative path starting with a forward slash (/).
	Example: Use \<img src="/images/logo.png"\> not \<img src="../images/logo.png"\>.
2. No Direct File System Writes: The code MUST NOT use Node.js's fs (File System) module to write to the project's local directory (e.g., saving user uploads or data). All persistent storage must be handled by an external, remote service.
3. Use Framework Routing: For internal links and page navigation, the code MUST use the native framework routing utility (e.g., Next.js <Link> component) or relative paths, avoiding hard-coded deployment URLs.

###Deployment and Routing (Post-Generation)###
The app is designed to be a micro-frontend (served under a subdirectory like /promptvault), so include a note or instruction block outlining the additional steps required in the main Vercel router project:
1. Unique Vercel URL: The LLM should generate the application so that it functions correctly when deployed to its unique Vercel subdomain (e.g., my-app-xxxx.vercel.app).
2. External Rewrite Requirement: To integrate this app under a path like kiang.net/promptvault, the Root Router Project will require a manual rewrite rule added to its vercel.json file.

# PromptVault: Multi-Device Access via Supabase

## Overview

PromptVault currently stores all data client-side using IndexedDB (database name: `promptvault`, version 2). The app also uses `localStorage` for configuration (`promptvault_config`), UI preferences (`darkMode`), and the OpenAI API key (`openai_api_key`). This PRD describes adding Supabase as the primary data store when authenticated, so prompts are available across all of a user's devices.

The app is built with **SvelteKit + TypeScript + Tailwind CSS**, hosted on **Vercel**, deployed via **GitHub** (`dkiang/PromptVault`). It is served as a micro-frontend under `kiang.net/promptvault` via a rewrite rule in the root Vercel router project.

### Design Philosophy: Two Modes, Not a Sync Engine

This implementation does **not** build a sync engine. Instead, the app operates in one of two mutually exclusive modes:

- **Unauthenticated mode**: IndexedDB only. Behaves exactly as today. No changes.
- **Authenticated mode**: Supabase is the single source of truth. IndexedDB is not used for prompt storage. All reads and writes go directly to Supabase.

On first sign-in, local IndexedDB prompts are migrated to Supabase (a one-time upload). After that, IndexedDB is no longer consulted for prompts. This eliminates all merge logic, conflict resolution, deduplication, and offline queue complexity.

If the user is offline while authenticated, the app shows a clear "you're offline" indicator and disables editing. The user can still view cached prompts from the most recent load (held in memory or a Svelte store), but changes require connectivity. For a prompt management tool, this is an acceptable tradeoff.

---

## Current Data Model (from `src/lib/storage.ts`)

### IndexedDB Object Stores

**`prompts`** (keyPath: `id`)
```typescript
interface Prompt {
  id: string;          // crypto.randomUUID()
  title: string;       // Auto-generated from first 6 words of content if not provided
  content: string;     // The prompt text
  tags: string[];      // Array of tag strings
  isHidden: boolean;   // Whether the prompt is password-protected
  createdAt: Date;     // Date object stored directly in IndexedDB
  updatedAt: Date;     // Date object stored directly in IndexedDB
}
```
Indexes: `title`, `tags` (multiEntry), `isHidden`, `createdAt`

**`tags`** (keyPath: `id`)
```typescript
interface Tag {
  id: string;          // crypto.randomUUID()
  name: string;
  color?: string;
}
```

**`settings`** (keyPath: `key`)
Stores key-value pairs. Currently used for `hiddenPassword`.

### localStorage Keys
- `promptvault_config` — Feature flags and security config
- `darkMode` — `"true"` or `"false"`
- `openai_api_key` — User's OpenAI API key (stored by `AIService` in `src/lib/ai.ts`)

### Key Storage Behaviors
- IDs are generated via `crypto.randomUUID()` (already UUIDs — valid for PostgreSQL `UUID` columns)
- `importPrompts()` creates **new** prompts with new IDs (does not preserve original IDs)
- `exportPrompts()` dumps all prompts as JSON
- The `PromptStorage` class is a singleton exported as `storage`
- All CRUD goes through the `storage` object; components import from `$lib/storage`
- Dates are stored as `Date` objects in IndexedDB but will be ISO strings from Supabase
- `deletePrompt()` performs a hard delete
- Several components use `typeof window === 'undefined'` guards for SSR safety (e.g., `ai.ts`) — the Supabase client and auth store will need the same guards

---

## Goals

1. Prompts created or edited on any device appear on all other devices
2. Existing users do not lose their locally stored prompts
3. Authentication is simple and low-friction (magic link email)
4. Unauthenticated users can continue using the app with IndexedDB only
5. Minimize implementation complexity — no sync engine, no merge logic

## Non-Goals

- Offline editing when authenticated (show "offline" state instead)
- Bidirectional sync between IndexedDB and Supabase
- Syncing `tags` store, `settings` store, or any localStorage data
- Multi-user collaboration
- Admin dashboard

---

## Architecture

### Two Modes

```
┌─────────────────────────────────────────────────┐
│                  App Load                        │
│                                                  │
│     Authenticated?                               │
│     ┌──── YES ──────────── NO ────┐             │
│     ▼                              ▼             │
│  ┌──────────────┐          ┌──────────────┐     │
│  │   Supabase   │          │  IndexedDB   │     │
│  │  (all CRUD)  │          │  (all CRUD)  │     │
│  │              │          │  unchanged   │     │
│  │  prompts     │          │              │     │
│  │  held in     │          │              │     │
│  │  Svelte      │          │              │     │
│  │  store for   │          │              │     │
│  │  display     │          │              │     │
│  └──────────────┘          └──────────────┘     │
└─────────────────────────────────────────────────┘
```

### What This Eliminates

By not syncing, we eliminate:
- `pending_sync` IndexedDB object store
- `dbVersion` bump (stays at 2)
- Merge logic and conflict resolution
- Content-hash deduplication
- Clock skew tolerance
- Offline write queue
- Migration flag with retry logic
- Dual-write to both stores

---

## Database Schema

### Table: `prompts`

```sql
CREATE TABLE prompts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user-scoped queries
CREATE INDEX idx_prompts_user_id ON prompts(user_id);

-- Enable Row-Level Security
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own prompts
CREATE POLICY "Users can read own prompts"
  ON prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts"
  ON prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON prompts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts"
  ON prompts FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prompts_updated_at
  BEFORE UPDATE ON prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Notes on Schema

- **No `deleted_at` column**: With no sync engine, there's no need for soft deletes. Hard deletes work fine when Supabase is the single source of truth.
- **Column name mapping**: TypeScript uses camelCase (`isHidden`, `createdAt`), Supabase uses snake_case (`is_hidden`, `created_at`). The storage abstraction must map between these.
- **Date serialization**: IndexedDB stores native `Date` objects. Supabase returns ISO 8601 strings. Convert with `new Date(row.created_at)` when reading and `.toISOString()` when writing. The existing `getAllPrompts()` in `storage.ts` already does this conversion.
- **IDs are preserved**: The migration uploads prompts with their existing UUIDs. The `id` column is a client-generated UUID, not a Supabase auto-generated one.

---

## Authentication

### Method: Magic Link (Email)

### Magic Link Redirect URL

Because PromptVault runs under `/promptvault`, the redirect must be configured correctly. In the Supabase dashboard under Authentication → URL Configuration:

- **Site URL**: `https://kiang.net/promptvault`
- **Redirect URLs** (allowed list): `https://kiang.net/promptvault`, `https://prompt-vault-eta.vercel.app`, `http://localhost:5173`

The `signIn` function must pass the redirect URL explicitly:

```typescript
await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: window.location.origin + '/promptvault'
  }
});
```

### Security: Anon Key

The Supabase anon key is intentionally public and shipped in client-side JavaScript. This is safe **only because RLS policies are enforced**. RLS must be enabled on the `prompts` table before deploying. This is not optional.

### SSR Safety

SvelteKit may attempt to run code server-side during SSR. The Supabase client and auth store must guard against this, following the existing pattern in `ai.ts`:

```typescript
if (typeof window === 'undefined') return null;
```

The Supabase client should only be initialized in the browser.

### Environment Variables

Add to `.env` (local dev) and Vercel project settings (production):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

SvelteKit uses `VITE_` prefix for client-side env vars. The `.env` file is already in `.gitignore`.

---

## Storage Abstraction Layer

### Approach: Replace the Data Source, Keep the Interface

The current app calls methods on the `storage` singleton (`storage.getAllPrompts()`, `storage.savePrompt()`, etc.). Rather than changing every component, create a new abstraction that presents the same interface but routes to different backends based on auth state.

Create `src/lib/cloud-storage.ts`:

```typescript
import { storage } from './storage';         // existing IndexedDB storage
import { supabaseStorage } from './supabase-storage';  // new Supabase storage
import { currentUser } from './auth';
import { get } from 'svelte/store';

function isAuthenticated(): boolean {
  return get(currentUser) !== null;
}

export const dataStore = {
  getAllPrompts: () => isAuthenticated()
    ? supabaseStorage.getAllPrompts()
    : storage.getAllPrompts(),

  savePrompt: (prompt) => isAuthenticated()
    ? supabaseStorage.savePrompt(prompt)
    : storage.savePrompt(prompt),

  updatePrompt: (id, updates) => isAuthenticated()
    ? supabaseStorage.updatePrompt(id, updates)
    : storage.updatePrompt(id, updates),

  deletePrompt: (id) => isAuthenticated()
    ? supabaseStorage.deletePrompt(id)
    : storage.deletePrompt(id),

  searchPrompts: (query) => isAuthenticated()
    ? supabaseStorage.searchPrompts(query)
    : storage.searchPrompts(query),

  exportPrompts: () => isAuthenticated()
    ? supabaseStorage.exportPrompts()
    : storage.exportPrompts(),

  importPrompts: (data) => isAuthenticated()
    ? supabaseStorage.importPrompts(data)
    : storage.importPrompts(data),

  // These always use local storage (not synced)
  getHiddenPassword: () => storage.getHiddenPassword(),
  setHiddenPassword: (pw) => storage.setHiddenPassword(pw),
  resetHiddenPassword: () => storage.resetHiddenPassword(),
  deleteAllHiddenPrompts: () => isAuthenticated()
    ? supabaseStorage.deleteAllHiddenPrompts()
    : storage.deleteAllHiddenPrompts(),
};
```

Then update all imports throughout the app: change `import { storage } from '$lib/storage'` to `import { dataStore as storage } from '$lib/cloud-storage'`. The method signatures stay the same, so component code doesn't change beyond the import path.

### `supabase-storage.ts` Implementation Notes

This file implements the same interface as `PromptStorage` but hits Supabase instead of IndexedDB:

- `getAllPrompts()` → `supabase.from('prompts').select('*').eq('user_id', userId).order('created_at', { ascending: false })`
- `savePrompt()` → `supabase.from('prompts').insert({ id: crypto.randomUUID(), user_id: userId, ...mapped })` — must map camelCase → snake_case
- `updatePrompt()` → `supabase.from('prompts').update(mapped).eq('id', id).eq('user_id', userId)`
- `deletePrompt()` → `supabase.from('prompts').delete().eq('id', id).eq('user_id', userId)` — hard delete is fine here
- `searchPrompts()` → `supabase.from('prompts').select('*').eq('user_id', userId).or(`title.ilike.%${query}%,content.ilike.%${query}%`)` — tag search requires additional handling since tags are an array
- `exportPrompts()` → fetch all, `JSON.stringify()`
- `importPrompts()` → parse JSON, upsert each (using content-hash to skip duplicates)
- All responses must convert snake_case → camelCase and ISO strings → `Date` objects before returning

---

## One-Time Migration (IndexedDB → Supabase)

### When It Triggers

On first sign-in, if IndexedDB contains prompts and Supabase is empty for this user.

### Sequence

```
1. User signs in via magic link
2. Fetch prompt count from Supabase for this user_id
3. If count > 0: skip migration (user already has cloud data, possibly from another device)
     → Show cloud prompts immediately
4. If count == 0: check IndexedDB for local prompts
5. If no local prompts: done (fresh user)
6. If local prompts exist:
   a. Show migration modal: "Upload your N local prompts to the cloud? [Upload] [Skip]"
   b. On "Upload": upsert all IndexedDB prompts to Supabase, preserving original IDs
   c. Verify upload count matches local count
   d. Show "Migration complete — N prompts now available on all your devices"
   e. App now operates in authenticated mode (reads from Supabase)
7. On "Skip": app operates in authenticated mode with empty Supabase (local prompts remain in IndexedDB but are not shown while authenticated)
```

### Edge Case: User Skips Migration Then Signs Out

If the user skips migration and later signs out, they return to unauthenticated mode and see their IndexedDB prompts again. Nothing is lost. If they sign in again later, the migration prompt reappears (Supabase is still empty).

### Edge Case: User Has Data on Two Devices

Device A signs in first → migrates local prompts to Supabase.
Device B signs in → Supabase already has data (step 3 above), so migration is skipped.
Device B's local IndexedDB prompts are now "orphaned" — they still exist locally but aren't shown while authenticated.

To handle this, add a secondary check: if Supabase has data AND IndexedDB has prompts that are NOT in Supabase (compare by `id`), show a prompt:

```
"You have N local prompts on this device that aren't in your cloud library.
[Upload them] [Discard them] [Remind me later]"
```

"Upload" upserts the missing prompts (by `id`, so no duplicates). "Discard" clears the local IndexedDB prompts. "Remind me later" dismisses for this session.

---

## Offline Behavior (Authenticated)

When authenticated, the app depends on Supabase for all reads and writes. If the network is unavailable:

### Detection

```typescript
// In sync.ts or a dedicated connectivity store
import { writable } from 'svelte/store';

export const isOnline = writable(navigator.onLine);

window.addEventListener('online', () => isOnline.set(true));
window.addEventListener('offline', () => isOnline.set(false));
```

### Behavior When Offline

- **Viewing prompts**: Works. The most recent prompt list is held in a Svelte store (`prompts` in `+page.svelte`). The user sees whatever was loaded on the last successful fetch.
- **Creating/editing/deleting**: Disabled. Buttons show a tooltip or the app shows a banner: "You're offline — changes can't be saved right now."
- **Search**: Works against the in-memory prompt list.
- **Export**: Works (exports from the in-memory list).
- **Import**: Disabled while offline.

### When Connection Returns

- The `online` event fires → `isOnline` store updates → UI re-enables editing
- Optionally, trigger a fresh fetch from Supabase to pick up any changes made on other devices while this one was offline

This is intentionally simple. If offline editing becomes a real need, the sync engine from the complex PRD can be added later.

---

## What Does NOT Sync (and Why)

| Local Data | Syncs? | Reason |
|------------|--------|--------|
| Prompts (`prompts` store) | ✅ Yes | Core data, the whole point of this feature |
| Tags (`tags` store) | ❌ No | Tags are derived from prompts at display time via `extractTags()` in `+page.svelte` |
| Settings (`settings` store) | ❌ No | Contains `hiddenPassword` — security-sensitive, intentionally device-local |
| `promptvault_config` (localStorage) | ❌ No | Feature flags — device-specific |
| `darkMode` (localStorage) | ❌ No | UI preference — may differ per device |
| `openai_api_key` (localStorage) | ❌ No | Sensitive credential — must not travel through any cloud database |

**Note for users**: After signing in on a new device, the OpenAI API key must be re-entered in Settings. This is intentional.

---

## UI Changes

### Sidebar (in `+page.svelte`)

Add below the Settings button, above "About this app":

```
🔑 Sign In              (when not authenticated)
✅ user@email.com        (when authenticated + online)
⚡ user@email.com        (when authenticated + offline)
   [Sign Out]
```

### Header (in `+page.svelte`)

Next to "+ New Prompt", show a small connectivity indicator when authenticated:
- 🟢 (online, last sync successful)
- 🔴 (offline — tooltip: "You're offline")

### Migration Modal

Shown once on first sign-in with local data. A simple modal, not a banner:

```
┌───────────────────────────────────────────────┐
│  📤 Upload your prompts to the cloud?         │
│                                               │
│  You have N prompts stored on this device.    │
│  Upload them so you can access them from      │
│  any device.                                  │
│                                               │
│  [Upload]     [Skip for now]                  │
└───────────────────────────────────────────────┘
```

### Offline State

When authenticated and offline, show a non-dismissible banner at the top of the main content area:

```
┌───────────────────────────────────────────────┐
│  ⚡ You're offline. Viewing cached prompts.   │
│  Editing is disabled until you reconnect.     │
└───────────────────────────────────────────────┘
```

Disable the "+ New Prompt" button, all "Edit" buttons, all "Delete" buttons, and the "Import" button. "Copy" and "Export" remain enabled.

---

## Implementation Checklist

Build order. Each step should be completed and verified before moving to the next.

### Step 0: Preparation
- [ ] Create Supabase project (free tier)
- [ ] Run the SQL schema in Supabase SQL editor
- [ ] Configure Authentication → URL Configuration with redirect URLs (see Magic Link Redirect URL section)
- [ ] Verify RLS is enabled on the `prompts` table
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env` and Vercel project settings
- [ ] `npm install @supabase/supabase-js`

### Step 1: Supabase Client and Auth
- [ ] Create `src/lib/supabase.ts` — client initialization with SSR guard
- [ ] Create `src/lib/auth.ts` — `currentUser` store, `signIn()`, `signOut()` helpers, with SSR guard
- [ ] Verify magic link sends, redirects to `/promptvault`, and session persists across page reloads
- [ ] Test on both `kiang.net/promptvault` and the direct Vercel URL

### Step 2: Supabase Storage
- [ ] Create `src/lib/supabase-storage.ts` implementing the same interface as `PromptStorage`
- [ ] Implement camelCase ↔ snake_case field mapping
- [ ] Implement Date ↔ ISO string conversion
- [ ] Implement `getAllPrompts`, `savePrompt`, `updatePrompt`, `deletePrompt`, `searchPrompts`, `exportPrompts`, `importPrompts`
- [ ] Test all CRUD operations via Supabase dashboard

### Step 3: Storage Abstraction
- [ ] Create `src/lib/cloud-storage.ts` — routes calls to IndexedDB or Supabase based on auth state
- [ ] Update all imports across components: `storage` → `dataStore as storage` from `cloud-storage`
- [ ] Verify unauthenticated mode still works identically to current behavior
- [ ] Verify authenticated mode reads/writes to Supabase

### Step 4: Auth UI
- [ ] Add Sign In / Sign Out controls to sidebar in `+page.svelte`
- [ ] Build email input modal for magic link flow
- [ ] Show signed-in indicator in sidebar
- [ ] Subscribe to `currentUser` store for reactive UI

### Step 5: Migration Flow
- [ ] On first sign-in: check if Supabase is empty for this user
- [ ] If empty and IndexedDB has data: show migration modal
- [ ] "Upload": upsert all IndexedDB prompts to Supabase preserving IDs, verify count
- [ ] "Skip": proceed with empty Supabase
- [ ] Handle second-device edge case: detect orphaned local prompts and offer to upload

### Step 6: Connectivity Handling
- [ ] Create `src/lib/connectivity.ts` — `isOnline` Svelte store with event listeners
- [ ] When offline + authenticated: show offline banner, disable editing buttons
- [ ] When back online: re-enable editing, optionally refetch from Supabase
- [ ] Test with airplane mode toggle

### Step 7: Polish
- [ ] Loading state while fetching prompts from Supabase on app load
- [ ] Error handling for failed Supabase operations (show toast/banner, don't silently fail)
- [ ] Verify hidden prompts work correctly through Supabase (`is_hidden` column)
- [ ] Verify `resetHiddenPassword()` deletes hidden prompts from Supabase when authenticated
- [ ] Verify export works from both modes
- [ ] Verify import deduplicates when authenticated (skip prompts with matching content)
- [ ] Test on mobile Safari, Chrome, and Firefox

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client initialization (with SSR guard) |
| `src/lib/auth.ts` | Auth state store (`currentUser`) and helpers (`signIn`, `signOut`) |
| `src/lib/supabase-storage.ts` | Supabase CRUD — same interface as `PromptStorage`, with field mapping and date conversion |
| `src/lib/cloud-storage.ts` | Routing layer — dispatches to IndexedDB or Supabase based on auth state |
| `src/lib/connectivity.ts` | `isOnline` Svelte store with `online`/`offline` event listeners |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/components/ExportImport.svelte` | Change `storage` import to `cloud-storage`; add duplicate detection on import when authenticated |
| `src/lib/components/PromptCard.svelte` | Change `storage` import to `cloud-storage`; disable Edit/Delete buttons when offline + authenticated |
| `src/lib/components/CreatePromptForm.svelte` | Change `storage` import to `cloud-storage` |
| `src/lib/components/SettingsModal.svelte` | Change `storage` import to `cloud-storage` (for password management calls that still use IndexedDB) |
| `src/routes/+page.svelte` | Change `storage` import to `cloud-storage`; add auth UI to sidebar; add offline banner; add migration modal; subscribe to `currentUser` and `isOnline` stores |
| `package.json` | Add `@supabase/supabase-js` dependency |
| `.env` (new file) | Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |

**Note**: `src/lib/storage.ts` is NOT modified. It continues to work exactly as today for unauthenticated users.

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| **Supabase free tier discontinued** | JSON export always available; data is standard PostgreSQL |
| **User loses magic link email (spam filter)** | "Resend link" button; consider Google OAuth later |
| **Anon key abused** | RLS policies enforce per-user isolation; anon key alone cannot access other users' data |
| **Magic link redirects to wrong URL** | Explicit `emailRedirectTo` in `signInWithOtp()`; redirect URLs configured in Supabase dashboard |
| **SSR tries to access browser APIs** | `typeof window === 'undefined'` guards on Supabase client and auth store |
| **User skips migration, signs out, loses track of local data** | IndexedDB data remains untouched; reappears in unauthenticated mode; migration re-offered on next sign-in |
| **Two devices have different local prompts** | Second-device detection offers to upload orphaned prompts |
| **Offline user tries to edit** | Editing disabled with clear visual feedback; no silent data loss |
| **OpenAI API key doesn't appear on new device** | Intentional — must re-enter in Settings; documented |
| **Import creates duplicates** | Content-based dedup check before inserting when authenticated |

---

## Supabase Free Tier Limits (as of 2025)

- 500 MB database storage
- 1 GB file storage
- 50,000 monthly active users
- Unlimited API requests
- 2 projects

For a single-user prompt management app, these limits are irrelevant.

---

## What This Approach Trades Away

Being explicit about what you lose with this simpler design:

| Capability | Complex (sync engine) | Simple (this PRD) |
|------------|----------------------|-------------------|
| Offline editing | ✅ Queued and synced later | ❌ Disabled with notification |
| Works without internet | ✅ Full functionality | ⚠️ Read-only (cached view) |
| IndexedDB as durable cache | ✅ Always in sync | ❌ Not used when authenticated |
| Merge conflicts | Must handle | Don't exist |
| Implementation complexity | ~4 new files + sync engine | ~5 new files, all straightforward |
| Lines of custom sync code | ~300-500 | 0 |
| Risk of data duplication bugs | Moderate | Very low |

If offline editing later proves necessary, the upgrade path is: add a `pending_writes` store to IndexedDB, queue writes when offline, flush on reconnection. This can be added incrementally without redesigning the architecture.

---

## Future Considerations (Out of Scope for V1)

- **Google OAuth**: Lower friction than magic link. Add via Supabase dashboard.
- **Offline editing**: Add a write queue if needed. See "What This Approach Trades Away."
- **Sharing / Public prompts**: A `is_public` column for URL-based sharing. Potentially useful as a teaching tool.
- **Prompt versioning**: `prompt_versions` table for edit history.
