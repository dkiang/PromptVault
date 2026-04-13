# PromptVault: Multi-Device Sync via Supabase

## Overview

PromptVault currently stores all data client-side using IndexedDB (database name: `promptvault`, version 2). The app also uses `localStorage` for configuration (`promptvault_config`), UI preferences (`darkMode`), and the OpenAI API key (`openai_api_key`). This PRD section describes adding cloud-based sync via Supabase so prompts are available across all of a user's devices.

The app is built with **SvelteKit + TypeScript + Tailwind CSS**, hosted on **Vercel**, deployed via **GitHub** (`dkiang/PromptVault`). It is served as a micro-frontend under `kiang.net/promptvault` via a rewrite rule in the root Vercel router project.

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
- `promptvault_config` — Feature flags and security config (`{ features: { hiddenPrompts: boolean }, security: { defaultPassword: string } }`)
- `darkMode` — `"true"` or `"false"`
- `openai_api_key` — User's OpenAI API key (stored by `AIService` class in `src/lib/ai.ts`)

### Key Storage Behaviors
- IDs are generated via `crypto.randomUUID()` (already UUIDs)
- `importPrompts()` creates **new** prompts with new IDs (does not preserve original IDs) — this is a duplication risk during sync; see Migration Safeguards
- `exportPrompts()` dumps all prompts as JSON via `storage.getAll()`
- The `PromptStorage` class is a singleton exported as `storage`
- All CRUD goes through the `storage` object; components import from `$lib/storage`
- `deletePrompt()` performs a **hard delete** from IndexedDB (no soft delete) — this must change for sync; see Deletion Handling
- `resetHiddenPassword()` performs a **bulk hard delete** of all hidden prompts — sync engine must handle this; see Deletion Handling
- `ExportImport.svelte` calls `window.location.reload()` after import — this could race with sync writes; see Import/Export During Sync
- Dates are stored as `Date` objects in IndexedDB but will be ISO strings from Supabase — the sync layer must handle serialization

---

## Goals

1. Prompts created or edited on any device appear on all other devices
2. The app continues to work offline (IndexedDB remains the local cache)
3. Existing users do not lose their locally stored prompts
4. Authentication is simple and low-friction (magic link email)
5. Unauthenticated users can continue using the app with IndexedDB only
6. The `storage` API surface stays the same — sync is transparent to components

## Non-Goals

- Multi-user collaboration or sharing prompts between accounts
- Real-time collaborative editing or real-time subscriptions
- Syncing `tags` object store or `settings` object store (these remain local)
- Syncing localStorage data (config, dark mode, OpenAI API key)
- Admin dashboard

---

## Architecture

### Stack

- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with magic link (email-based, no password)
- **Client**: `@supabase/supabase-js` SDK
- **Hosting**: Vercel (unchanged)
- **Local cache**: IndexedDB (unchanged, now serves as offline fallback)

### Data Flow

```
┌──────────────┐       ┌──────────────────┐
│  IndexedDB   │◄─────►│   Sync Engine    │
│  (cache/     │       │  (read/write     │
│   offline)   │       │   arbitration)   │
└──────────────┘       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │    Supabase      │
                       │  (PostgreSQL +   │
                       │   Auth + RLS)    │
                       └──────────────────┘
```

When authenticated:
1. On load: fetch from Supabase, merge with IndexedDB, render
2. On save/update/delete: write to both Supabase and IndexedDB
3. On offline: write to IndexedDB, queue sync for reconnection

When unauthenticated:
1. Behave exactly as the app does today (IndexedDB only)

---

## Database Schema

### Table: `prompts`

This schema mirrors the existing `Prompt` interface exactly.

```sql
CREATE TABLE prompts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- Index for fast user-scoped queries
CREATE INDEX idx_prompts_user_id ON prompts(user_id);
CREATE INDEX idx_prompts_updated_at ON prompts(updated_at);

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

- **Column name mapping**: The TypeScript interface uses camelCase (`isHidden`, `createdAt`). The Supabase table uses snake_case (`is_hidden`, `created_at`). The sync layer must map between these conventions in both directions.
- **Date serialization**: IndexedDB stores native `Date` objects. Supabase returns ISO 8601 strings. The sync layer must convert: `new Date(supabaseRow.created_at)` when reading from cloud, and `.toISOString()` when writing to cloud. The existing `getAllPrompts()` in `storage.ts` already does `new Date(prompt.createdAt)` on read, so the pattern is established.
- **IDs are preserved**: Unlike the current `importPrompts()` which generates new IDs, the sync layer must preserve the original `id` (already a UUID from `crypto.randomUUID()`). This is the primary key for merging.
- **Soft deletes**: `deleted_at` enables sync-aware deletion. When a prompt is deleted on one device, it's marked as deleted rather than removed, so other devices learn about the deletion. Purge records where `deleted_at` is older than 30 days via periodic SQL or a Supabase cron.
- **Tags as array**: PostgreSQL's native `TEXT[]` type matches the existing `string[]` in TypeScript.

---

## Authentication

### Method: Magic Link (Email)

Magic link is the lowest-friction auth method. No passwords to manage, no OAuth provider configuration needed.

### Magic Link Redirect URL

**IMPORTANT**: Because PromptVault runs under a subdirectory (`kiang.net/promptvault`), the Supabase magic link redirect must be configured to point to the correct URL. In the Supabase dashboard under Authentication → URL Configuration:

- **Site URL**: `https://kiang.net/promptvault`
- **Redirect URLs** (allowed list): `https://kiang.net/promptvault`, `https://prompt-vault-eta.vercel.app` (for the direct Vercel domain), and `http://localhost:5173` (for local dev)

The `signIn` function must also pass the redirect URL explicitly:

```typescript
await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo: window.location.origin + '/promptvault'
  }
});
```

If this is not configured correctly, the magic link will redirect to the Supabase project URL or the site root, and the auth session will not be picked up by the app.

### New Files

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### Environment Variables

Add to `.env` (local dev) and Vercel project settings (production):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Note: SvelteKit uses `VITE_` prefix for client-side env vars (not `NEXT_PUBLIC_`). The `.env` file is already in `.gitignore`.

### Security Note: Anon Key Exposure

The Supabase anon key is intentionally public and shipped in client-side JavaScript. This is expected and safe **only because Row-Level Security (RLS) policies are enforced**. The anon key allows unauthenticated access to the Supabase API, but RLS ensures that every query is scoped to `auth.uid() = user_id`. Without RLS, anyone with the anon key could read or modify all data. **RLS must be enabled on the `prompts` table before deploying. This is not optional.**

### UI Integration Points

The auth UI should be added to **two locations in `+page.svelte`**:

1. **Sidebar** (bottom, above "About this app" button): Sign In / Sign Out button and sync status indicator
2. **Header** (next to "+ New Prompt"): Small signed-in indicator (email)

Auth state should be managed via a Svelte store in `src/lib/auth.ts`:

```typescript
import { writable } from 'svelte/store';
import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export const currentUser = writable<User | null>(null);

// Initialize on app load
supabase.auth.getSession().then(({ data: { session } }) => {
  currentUser.set(session?.user ?? null);
});

// Listen for auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  currentUser.set(session?.user ?? null);
});
```

---

## Modifying `PromptStorage` for Sync

The key architectural decision: **do not replace the `PromptStorage` class**. Instead, wrap it with a sync-aware layer that intercepts calls and mirrors them to Supabase when authenticated.

### Approach: Extend `storage.ts`

Add a `SyncManager` class in a new file `src/lib/sync.ts` that:

1. Subscribes to `currentUser` store
2. When authenticated, wraps every `savePrompt`, `updatePrompt`, `deletePrompt` call to also write to Supabase
3. On app load (when authenticated), runs a merge between IndexedDB and Supabase
4. Exposes a `syncStatus` Svelte store: `'idle' | 'syncing' | 'offline' | 'error'`

### Modified Call Flow

```
Component calls storage.savePrompt(data)
  → PromptStorage writes to IndexedDB (unchanged)
  → SyncManager detects the write
  → If authenticated: upsert to Supabase
  → If offline: add to pendingSync queue in IndexedDB
```

### Pending Sync Queue

Add a new IndexedDB object store `pending_sync` (requires incrementing `dbVersion` to 3):

```typescript
// In storage.ts onupgradeneeded:
if (!db.objectStoreNames.contains('pending_sync')) {
  db.createObjectStore('pending_sync', { keyPath: 'id', autoIncrement: true });
}
```

Each entry stores: `{ promptId: string, action: 'upsert' | 'delete', timestamp: Date }`

On reconnection, process the queue in order and clear processed entries.

---

## Deletion Handling

### Problem

The current `deletePrompt()` in `storage.ts` performs a hard delete from IndexedDB:

```typescript
async deletePrompt(id: string): Promise<void> {
  // ... store.delete(id) — gone forever
}
```

This is incompatible with sync. If Device A deletes a prompt, Device B has no way to learn about the deletion — it would just re-upload the "missing" prompt on next sync, effectively un-deleting it.

Additionally, `resetHiddenPassword()` calls `deletePrompt()` in a loop for all hidden prompts, creating a bulk hard-delete scenario.

### Solution

When authenticated, `deletePrompt()` must change behavior:

1. **Supabase**: Set `deleted_at = NOW()` (soft delete) instead of removing the row
2. **IndexedDB**: Still perform the hard delete (to keep the local UI responsive and simple)
3. **Pending sync queue**: If offline, record the delete action so it can be soft-deleted in Supabase on reconnection

On sync (app load), the sync engine checks for prompts with `deleted_at IS NOT NULL` in Supabase and removes them from IndexedDB if they exist locally.

For `resetHiddenPassword()` bulk deletes: the sync engine should handle this as multiple individual soft-deletes. No special bulk handling needed — the loop already iterates through each prompt.

### Purge Strategy

Soft-deleted records accumulate in Supabase. Implement one of:
- A Supabase scheduled function (cron) that purges `WHERE deleted_at < NOW() - INTERVAL '30 days'`
- A manual SQL query run periodically
- A purge button in a future admin UI

---

## Migration Safeguards

### Problem: Duplicate Prevention

The current `importPrompts()` function generates new IDs for every imported prompt:

```typescript
async importPrompts(data: string): Promise<void> {
  const prompts: Prompt[] = JSON.parse(data);
  for (const prompt of prompts) {
    await this.savePrompt({  // savePrompt() calls crypto.randomUUID()
      title: prompt.title,
      content: prompt.content,
      tags: prompt.tags,
      isHidden: prompt.isHidden
    });
  }
}
```

If the sync engine follows this pattern for migration, every local prompt would be uploaded with a new ID, then synced back down as a "new" prompt alongside the original, creating duplicates.

### Solution: Migration Must Preserve IDs

The sync engine's initial migration must use the existing `id` from each IndexedDB prompt as the primary key in Supabase, using `UPSERT` (insert-or-update on conflict) rather than `INSERT`. Since IDs are already UUIDs via `crypto.randomUUID()`, they are valid for the `UUID` column in PostgreSQL.

### Migration Flag

Write a flag to the IndexedDB `settings` store immediately after a successful initial migration:

```typescript
{ key: 'sync_migration_complete', value: true, migratedAt: new Date().toISOString(), userId: user.id }
```

This prevents re-migration if:
- The user signs out and back in
- The app reloads mid-session
- The browser restarts

The flag includes `userId` so that if a different user signs in on the same browser, a fresh migration runs for them.

### Migration Sequence (Atomic)

```
1. Read all prompts from IndexedDB
2. Count them (expectedCount)
3. Upsert each to Supabase, preserving the original id
4. Fetch count from Supabase for this user_id
5. Verify uploadedCount >= expectedCount
6. Write migration flag to settings store
7. Show "Sync complete — N prompts synced"
```

If step 3, 4, or 5 fails:
- Do NOT write the migration flag
- Show error: "Sync incomplete — your local data is safe. Try again."
- Next app load will retry (migration flag absent = retry)
- Upserts are idempotent, so retrying won't create duplicates

### Content-Hash Deduplication for Multi-Device Merge

When a user has already signed in on Device A (migrating prompts to Supabase), then signs in on Device B which has its own local prompts, the "Merge all" option must handle a specific edge case: prompts that exist on both sides with **the same content but different IDs**.

This happens when the user previously exported from Device A, imported on Device B (which generates new IDs), and then both devices migrate independently.

During merge, after matching by `id`, perform a secondary deduplication pass:
1. Compute a content hash for each unmatched prompt: `hash(content + tags.sort().join(','))`
2. If two prompts from different sources share the same content hash, treat them as the same prompt
3. Keep the one with the earlier `createdAt` (it's the original) and discard the duplicate
4. Log deduplicated prompts to console for debugging

---

## Import/Export Behavior During Sync

### Problem

`ExportImport.svelte` calls `window.location.reload()` immediately after `storage.importPrompts()` completes. If the user is authenticated, this import creates new prompts in IndexedDB (with new IDs), then the page reload triggers a sync on load, which would upload all the new imports to Supabase. This is actually fine for "additive" imports.

However, the import also does not check for duplicates — if you import a file that contains prompts already in your database, you'll get duplicates in both IndexedDB and Supabase.

### Solution

When authenticated, modify the import flow:
1. Parse the import file
2. For each prompt, compute a content hash and check against existing prompts
3. Skip prompts that already exist (same content hash)
4. Import only genuinely new prompts
5. Sync new prompts to Supabase
6. Show a summary: "Imported X new prompts, skipped Y duplicates"
7. Then reload (or better: reactively update the prompt list without reload)

---

## Sync Engine: Merge Logic

### Initial Migration (first sign-in with existing IndexedDB data)

```
1. User signs in via magic link
2. Check for migration flag in settings store
3. If flag exists and userId matches: skip migration, proceed to normal sync
4. Fetch all prompts from Supabase for this user_id
5. Read all prompts from IndexedDB

If Supabase is empty:
  → Upload all IndexedDB prompts to Supabase (preserve existing IDs)
  → Verify upload count
  → Write migration flag
  → Done

If both have data (user signed in on another device first):
  → Present choice: "Merge all", "Keep cloud", "Keep local"
  → "Merge all":
    a. Match by id first (same prompt, updated on different devices)
    b. For id matches: keep the one with later updated_at
    c. For unmatched prompts: run content-hash deduplication
    d. Add remaining unmatched prompts from both sides
    e. Write merged set to both IndexedDB and Supabase
  → "Keep cloud": replace IndexedDB with Supabase data
  → "Keep local": replace Supabase with IndexedDB data
  → Write migration flag after any choice
```

### Normal Sync (authenticated user, ongoing use)

```
On app load:
  1. Fetch all prompts from Supabase (including soft-deleted: WHERE user_id = auth.uid())
  2. Read all prompts from IndexedDB
  3. For each prompt:
     - In Supabase with deleted_at set: remove from IndexedDB if present
     - Exists in both (matched by id): keep the one with later updated_at
     - Exists only in cloud (not deleted): add to IndexedDB
     - Exists only in IndexedDB: upsert to Supabase
  4. Process pending_sync queue (offline changes)
  5. Write merged set to IndexedDB
```

### Conflict Resolution

- **Last-write-wins** based on `updated_at`
- Use server-side `NOW()` for Supabase timestamps (not client clock) to avoid clock skew
- IndexedDB uses `new Date()` (client clock) — the sync engine should compare these with a tolerance of ±5 seconds to avoid false conflicts from minor clock differences

---

## Migration UX

### Phase 1: Pre-Migration (deploy before sync is ready)

No backend changes. Add a dismissible banner to `+page.svelte`:

```
┌───────────────────────────────────────────────┐
│  🔄 Cloud sync is coming!                     │
│  Export a backup of your prompts just in case. │
│  [Export JSON]                         [Dismiss]│
└───────────────────────────────────────────────┘
```

### Phase 2: Deploy Sync

Show one-time migration prompt when an unauthenticated user has existing IndexedDB data:

```
┌───────────────────────────────────────────────┐
│  🔄 Sync your prompts across devices!         │
│  Sign in to access your N prompts everywhere. │
│  [Sign In]     [Maybe Later]                  │
└───────────────────────────────────────────────┘
```

Dismissal preference stored in `localStorage` (`promptvault_sync_dismissed`). Show again after 7 days if still unsigned.

### Phase 3: Steady State

- Auth controls in sidebar
- Sync status indicator: ✅ Synced / 🔄 Syncing / ⚡ Offline
- JSON export/import remains available in Settings modal as manual backup

---

## What Does NOT Sync (and Why)

| Local Data | Syncs? | Reason |
|------------|--------|--------|
| Prompts (`prompts` store) | ✅ Yes | Core data, the whole point of this feature |
| Tags (`tags` store) | ❌ No | Tags are derived from prompts at display time via `extractTags()` in `+page.svelte`; they're redundant with prompt data |
| Settings (`settings` store) | ❌ No | Contains `hiddenPassword` — security-sensitive, intentionally device-local |
| `promptvault_config` (localStorage) | ❌ No | Feature flags and default password — device-specific preferences |
| `darkMode` (localStorage) | ❌ No | UI preference — may differ per device |
| `openai_api_key` (localStorage) | ❌ No | Sensitive credential — must not travel through any cloud database |

**Note for users**: After signing in on a new device, the OpenAI API key must be re-entered in Settings. This is intentional — API keys should not sync through third-party databases.

---

## Implementation Checklist

Build order. Each step should be completed and verified before moving to the next.

### Step 0: Preparation
- [ ] Create Supabase project (free tier)
- [ ] Run the SQL schema above in Supabase SQL editor
- [ ] Configure Supabase Authentication → URL Configuration with correct redirect URLs (see Magic Link Redirect URL section)
- [ ] Verify RLS is enabled on the `prompts` table (this is critical — see Security Note)
- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env` and Vercel project settings
- [ ] `npm install @supabase/supabase-js`

### Step 1: Supabase Client Module
- [ ] Create `src/lib/supabase.ts` with client initialization
- [ ] Create `src/lib/auth.ts` with `currentUser` store and auth helpers (`signIn`, `signOut`)
- [ ] Verify magic link sends, redirects to `/promptvault`, and session persists across page reloads

### Step 2: Auth UI
- [ ] Add Sign In / Sign Out controls to sidebar in `+page.svelte` (below Settings, above About)
- [ ] Build email input modal for magic link flow
- [ ] Show signed-in indicator (email) in header area next to "+ New Prompt"
- [ ] Subscribe to `currentUser` store for reactive UI

### Step 3: Supabase CRUD Functions
- [ ] Create `src/lib/supabase-storage.ts` with functions:
  - `fetchAllPrompts(userId)` — SELECT all (including soft-deleted) for sync
  - `fetchActivePrompts(userId)` — SELECT where `deleted_at IS NULL`
  - `upsertPrompt(userId, prompt)` — UPSERT with camelCase → snake_case mapping and Date → ISO string conversion
  - `softDeletePrompt(promptId)` — SET `deleted_at = NOW()`
- [ ] Verify RLS policies work (user can only access own data)
- [ ] Test with Supabase dashboard to confirm data round-trips correctly including Date serialization

### Step 4: Sync Engine
- [ ] Create `src/lib/sync.ts` with `SyncManager` class
- [ ] Implement merge logic (compare by `updated_at`, most recent wins, with ±5s tolerance)
- [ ] Implement content-hash deduplication for multi-device merge
- [ ] Add `pending_sync` object store to IndexedDB (bump `dbVersion` to 3 in `storage.ts`)
- [ ] Implement migration flag read/write in `settings` store
- [ ] On app load: if authenticated, check migration flag, then fetch + merge + render
- [ ] On save/update/delete: write to both Supabase and IndexedDB
- [ ] On delete (authenticated): soft-delete in Supabase, hard-delete in IndexedDB
- [ ] Handle offline: queue changes in `pending_sync`, process on reconnection via `navigator.onLine` and `online` event listener
- [ ] Expose `syncStatus` Svelte store for UI

### Step 5: Migration Flow
- [ ] Detect first-time sign-in with existing IndexedDB data (no migration flag)
- [ ] Upload IndexedDB prompts to Supabase preserving existing UUIDs (upsert, not insert)
- [ ] Verify upload count matches local count before writing migration flag
- [ ] Handle "both sides have data" conflict with user choice modal (Merge / Keep cloud / Keep local)
- [ ] Show migration banner/prompt (dismissible, re-shows after 7 days)
- [ ] Handle migration failure gracefully (no flag written, retry on next load)

### Step 6: Import/Export Updates
- [ ] Modify import flow to deduplicate by content hash when authenticated
- [ ] Show import summary ("X new, Y skipped")
- [ ] Ensure export still dumps all prompts (including those pending sync)
- [ ] Consider replacing `window.location.reload()` with reactive prompt list update

### Step 7: Polish
- [ ] Add sync status indicator to sidebar (✅ / 🔄 / ⚡)
- [ ] Error handling: retry logic with exponential backoff for failed Supabase writes
- [ ] Loading state during initial sync on app load
- [ ] Test on mobile Safari, Chrome, and Firefox
- [ ] Test offline → online transition (airplane mode toggle)
- [ ] Verify hidden prompts sync correctly (they have `is_hidden = true` in Supabase)
- [ ] Verify `resetHiddenPassword()` bulk delete propagates as soft-deletes to Supabase
- [ ] Ensure `tags` store and `settings` store remain local-only (no sync)
- [ ] Verify magic link works from both `kiang.net/promptvault` and the direct Vercel URL

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/supabase.ts` | Supabase client initialization |
| `src/lib/auth.ts` | Auth state store (`currentUser`) and helpers (`signIn`, `signOut`) |
| `src/lib/supabase-storage.ts` | Supabase CRUD operations with camelCase ↔ snake_case field mapping and Date serialization |
| `src/lib/sync.ts` | Sync engine: merge logic, content-hash deduplication, migration flag, pending queue, `syncStatus` store |

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/storage.ts` | Add `pending_sync` object store in `onupgradeneeded` (bump `dbVersion` to 3); add sync hooks after write operations; add migration flag helpers |
| `src/lib/components/ExportImport.svelte` | Add content-hash deduplication on import when authenticated; show import summary; consider removing `window.location.reload()` |
| `src/routes/+page.svelte` | Add auth UI to sidebar and header; add sync status indicator; add migration banner; import `currentUser` and `syncStatus` stores; trigger initial sync on mount when authenticated |
| `package.json` | Add `@supabase/supabase-js` dependency |
| `.env` (new file) | Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| **Supabase free tier discontinued or degraded** | JSON export always available; data is portable PostgreSQL |
| **Clock skew causes bad conflict resolution** | Use server-side `NOW()` for Supabase timestamps; compare with ±5s tolerance |
| **User loses magic link email (spam filter)** | "Resend link" button; consider adding Google OAuth later |
| **IndexedDB data wiped by browser (storage pressure)** | Cloud is source of truth when authenticated; show warning if local data is stale |
| **Merge logic creates duplicates from import/export** | Content-hash deduplication as secondary pass after id matching |
| **Migration interrupted (network failure, tab close)** | Migration flag not written until verified; upserts are idempotent so retry is safe |
| **`dbVersion` bump causes issues** | IndexedDB `onupgradeneeded` handles additive changes gracefully; existing stores are untouched |
| **Anon key leaked / abused** | RLS policies enforce per-user data isolation; anon key alone cannot access other users' data |
| **Magic link redirects to wrong URL** | Explicit `emailRedirectTo` in `signInWithOtp()` call; redirect URLs configured in Supabase dashboard |
| **Hard delete propagates before sync completes** | Authenticated deletes are soft-deletes in Supabase; IndexedDB hard-delete is local only |
| **`resetHiddenPassword()` bulk-deletes hidden prompts** | Each delete goes through the sync-aware delete path; all become individual soft-deletes in Supabase |
| **Import creates duplicates when synced** | Content-hash check before import when authenticated; skip existing prompts |
| **OpenAI API key doesn't sync to new device** | Intentional — user must re-enter in Settings; documented in "What Does NOT Sync" |
| **Date objects vs ISO strings mismatch** | Sync layer converts explicitly: `new Date()` ↔ `.toISOString()`; follows existing pattern in `getAllPrompts()` |

---

## Supabase Free Tier Limits (as of 2025)

- 500 MB database storage
- 1 GB file storage
- 50,000 monthly active users
- Unlimited API requests
- 2 projects

For a single-user prompt management app, these limits are irrelevant.

---

## Future Considerations (Out of Scope for V1)

- **Google OAuth**: Lower friction than magic link for some users. Add via Supabase Auth dashboard — minimal code changes beyond adding a "Sign in with Google" button.
- **Real-time subscriptions**: Supabase supports real-time. Useful if the app is ever open on two devices simultaneously. Not needed for V1.
- **Sync `tags` and `settings` stores**: Currently local-only. Could sync if multiple devices diverge on tag lists or hidden password.
- **Sharing / Public prompts**: A `is_public` column and a read-only view could allow sharing specific prompts via URL. Potentially useful as a teaching tool.
- **Prompt versioning**: Track edit history with a `prompt_versions` table.
