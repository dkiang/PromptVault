import { supabase } from './supabase';
import { currentUser } from './auth';
import { get } from 'svelte/store';
import type { Prompt } from './storage';
import { encryptField, decryptField } from './crypto';

function generateTitleFromContent(content: string): string {
  const firstLine = content.split('\n')[0];
  const words = firstLine.split(' ').slice(0, 6);
  return words.join(' ').substring(0, 50) + (firstLine.length > 50 ? '...' : '');
}

function getUserId(): string {
  const user = get(currentUser);
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// Decrypt a raw Supabase row into a Prompt. title, content, and each tag are
// encrypted individually so they appear opaque in the Table Editor.
async function decryptRow(row: Record<string, unknown>, userId: string): Promise<Prompt> {
  const [title, content, tags] = await Promise.all([
    decryptField(row.title as string, userId),
    decryptField(row.content as string, userId),
    Promise.all(((row.tags as string[]) ?? []).map(t => decryptField(t, userId))),
  ]);
  return {
    id: row.id as string,
    title,
    content,
    tags,
    isHidden: row.is_hidden as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

// Encrypt the three user-visible fields before writing to Supabase.
async function encryptFields(
  title: string,
  content: string,
  tags: string[],
  userId: string
): Promise<{ title: string; content: string; tags: string[] }> {
  const [encTitle, encContent, encTags] = await Promise.all([
    encryptField(title, userId),
    encryptField(content, userId),
    Promise.all(tags.map(t => encryptField(t, userId))),
  ]);
  return { title: encTitle, content: encContent, tags: encTags };
}

export const supabaseStorage = {
  async getAllPrompts(): Promise<Prompt[]> {
    if (!supabase) return [];
    const userId = getUserId();
    const { data, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return Promise.all((data ?? []).map(row => decryptRow(row as Record<string, unknown>, userId)));
  },

  async savePrompt(
    prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'title'> & { title?: string }
  ): Promise<Prompt> {
    if (!supabase) throw new Error('Supabase not initialized');
    const userId = getUserId();
    const plainTitle = prompt.title || generateTitleFromContent(prompt.content);
    const now = new Date().toISOString();
    const enc = await encryptFields(plainTitle, prompt.content, prompt.tags ?? [], userId);
    const row = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: enc.title,
      content: enc.content,
      tags: enc.tags,
      is_hidden: prompt.isHidden ?? false,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase.from('prompts').insert(row).select().single();
    if (error) throw error;
    return decryptRow(data as Record<string, unknown>, userId);
  },

  async updatePrompt(
    id: string,
    updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>
  ): Promise<Prompt | null> {
    if (!supabase) return null;
    const userId = getUserId();
    const mapped: Record<string, unknown> = {};

    // Encrypt any content fields that are being updated
    if (updates.title !== undefined) mapped.title = await encryptField(updates.title, userId);
    if (updates.content !== undefined) mapped.content = await encryptField(updates.content, userId);
    if (updates.tags !== undefined)
      mapped.tags = await Promise.all(updates.tags.map(t => encryptField(t, userId)));
    if (updates.isHidden !== undefined) mapped.is_hidden = updates.isHidden;

    const { data, error } = await supabase
      .from('prompts')
      .update(mapped)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return decryptRow(data as Record<string, unknown>, userId);
  },

  async deletePrompt(id: string): Promise<void> {
    if (!supabase) return;
    const userId = getUserId();
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async searchPrompts(query: string): Promise<Prompt[]> {
    // Fetch all (decrypted) and filter in-memory — server-side search can't
    // operate on encrypted data.
    const all = await this.getAllPrompts();
    const term = query.toLowerCase();
    return all.filter(
      p =>
        p.title.toLowerCase().includes(term) ||
        p.content.toLowerCase().includes(term) ||
        p.tags.some(t => t.toLowerCase().includes(term))
    );
  },

  async exportPrompts(): Promise<string> {
    const prompts = await this.getAllPrompts(); // returns decrypted
    return JSON.stringify(prompts, null, 2);
  },

  async importPrompts(data: string): Promise<void> {
    if (!supabase) return;
    const userId = getUserId();
    const prompts: Prompt[] = JSON.parse(data);
    const existing = await this.getAllPrompts(); // decrypted
    const existingContents = new Set(existing.map(p => p.content));
    for (const prompt of prompts) {
      if (existingContents.has(prompt.content)) continue;
      const plainTitle = prompt.title || generateTitleFromContent(prompt.content);
      const now = new Date().toISOString();
      const enc = await encryptFields(plainTitle, prompt.content, prompt.tags ?? [], userId);
      await supabase.from('prompts').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        title: enc.title,
        content: enc.content,
        tags: enc.tags,
        is_hidden: prompt.isHidden ?? false,
        created_at: now,
        updated_at: now,
      });
    }
  },

  async deleteAllHiddenPrompts(): Promise<void> {
    if (!supabase) return;
    const userId = getUserId();
    const { error } = await supabase
      .from('prompts')
      .delete()
      .eq('user_id', userId)
      .eq('is_hidden', true);
    if (error) throw error;
  },

  async getPromptCount(): Promise<number> {
    if (!supabase) return 0;
    const userId = getUserId();
    const { count, error } = await supabase
      .from('prompts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);
    if (error) return 0;
    return count ?? 0;
  },

  async upsertPrompts(prompts: Prompt[]): Promise<number> {
    if (!supabase) return 0;
    const userId = getUserId();
    const rows = await Promise.all(
      prompts.map(async p => {
        const plainTitle = p.title || generateTitleFromContent(p.content);
        const enc = await encryptFields(plainTitle, p.content, p.tags ?? [], userId);
        return {
          id: p.id,
          user_id: userId,
          title: enc.title,
          content: enc.content,
          tags: enc.tags,
          is_hidden: p.isHidden ?? false,
          created_at:
            p.createdAt instanceof Date
              ? p.createdAt.toISOString()
              : new Date(p.createdAt).toISOString(),
          updated_at:
            p.updatedAt instanceof Date
              ? p.updatedAt.toISOString()
              : new Date(p.updatedAt).toISOString(),
        };
      })
    );
    const { data, error } = await supabase
      .from('prompts')
      .upsert(rows, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return data?.length ?? 0;
  },
};
