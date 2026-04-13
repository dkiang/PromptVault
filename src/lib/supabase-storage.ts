import { supabase } from './supabase';
import { currentUser } from './auth';
import { get } from 'svelte/store';
import type { Prompt } from './storage';

function generateTitleFromContent(content: string): string {
  const firstLine = content.split('\n')[0];
  const words = firstLine.split(' ').slice(0, 6);
  return words.join(' ').substring(0, 50) + (firstLine.length > 50 ? '...' : '');
}

function fromRow(row: Record<string, unknown>): Prompt {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    tags: (row.tags as string[]) ?? [],
    isHidden: row.is_hidden as boolean,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

function getUserId(): string {
  const user = get(currentUser);
  if (!user) throw new Error('Not authenticated');
  return user.id;
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
    return (data ?? []).map(fromRow);
  },

  async savePrompt(
    prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'title'> & { title?: string }
  ): Promise<Prompt> {
    if (!supabase) throw new Error('Supabase not initialized');
    const userId = getUserId();
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: prompt.title || generateTitleFromContent(prompt.content),
      content: prompt.content,
      tags: prompt.tags ?? [],
      is_hidden: prompt.isHidden ?? false,
      created_at: now,
      updated_at: now,
    };
    const { data, error } = await supabase.from('prompts').insert(row).select().single();
    if (error) throw error;
    return fromRow(data as Record<string, unknown>);
  },

  async updatePrompt(
    id: string,
    updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>
  ): Promise<Prompt | null> {
    if (!supabase) return null;
    const userId = getUserId();
    const mapped: Record<string, unknown> = {};
    if (updates.title !== undefined) mapped.title = updates.title;
    if (updates.content !== undefined) mapped.content = updates.content;
    if (updates.tags !== undefined) mapped.tags = updates.tags;
    if (updates.isHidden !== undefined) mapped.is_hidden = updates.isHidden;
    const { data, error } = await supabase
      .from('prompts')
      .update(mapped)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return fromRow(data as Record<string, unknown>);
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
    const prompts = await this.getAllPrompts();
    return JSON.stringify(prompts, null, 2);
  },

  async importPrompts(data: string): Promise<void> {
    if (!supabase) return;
    const userId = getUserId();
    const prompts: Prompt[] = JSON.parse(data);
    const existing = await this.getAllPrompts();
    const existingContents = new Set(existing.map(p => p.content));
    for (const prompt of prompts) {
      if (existingContents.has(prompt.content)) continue;
      const now = new Date().toISOString();
      await supabase.from('prompts').insert({
        id: crypto.randomUUID(),
        user_id: userId,
        title: prompt.title || generateTitleFromContent(prompt.content),
        content: prompt.content,
        tags: prompt.tags ?? [],
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
    const rows = prompts.map(p => ({
      id: p.id,
      user_id: userId,
      title: p.title || generateTitleFromContent(p.content),
      content: p.content,
      tags: p.tags ?? [],
      is_hidden: p.isHidden ?? false,
      created_at:
        p.createdAt instanceof Date
          ? p.createdAt.toISOString()
          : new Date(p.createdAt).toISOString(),
      updated_at:
        p.updatedAt instanceof Date
          ? p.updatedAt.toISOString()
          : new Date(p.updatedAt).toISOString(),
    }));
    const { data, error } = await supabase
      .from('prompts')
      .upsert(rows, { onConflict: 'id' })
      .select();
    if (error) throw error;
    return data?.length ?? 0;
  },
};
