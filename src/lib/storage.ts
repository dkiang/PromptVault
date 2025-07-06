export interface Prompt {
  id: string;
  title: string;
  content: string;
  tags: string[];
  isHidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

class PromptStorage {
  private dbName = 'promptvault';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  private generateTitleFromContent(content: string): string {
    const firstLine = content.split('\n')[0];
    const words = firstLine.split(' ').slice(0, 6);
    return words.join(' ').substring(0, 50) + (firstLine.length > 50 ? '...' : '');
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('prompts')) {
          const promptStore = db.createObjectStore('prompts', { keyPath: 'id' });
          promptStore.createIndex('title', 'title');
          promptStore.createIndex('tags', 'tags', { multiEntry: true });
          promptStore.createIndex('isHidden', 'isHidden');
          promptStore.createIndex('createdAt', 'createdAt');
        }
        
        if (!db.objectStoreNames.contains('tags')) {
          db.createObjectStore('tags', { keyPath: 'id' });
        }
      };
    });
  }

  async getAllPrompts(): Promise<Prompt[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['prompts'], 'readonly');
      const store = transaction.objectStore('prompts');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const prompts = request.result.map(prompt => ({
          ...prompt,
          createdAt: new Date(prompt.createdAt),
          updatedAt: new Date(prompt.updatedAt)
        }));
        resolve(prompts);
      };
    });
  }

  async getPrompt(id: string): Promise<Prompt | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['prompts'], 'readonly');
      const store = transaction.objectStore('prompts');
      const request = store.get(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const prompt = request.result;
        if (prompt) {
          resolve({
            ...prompt,
            createdAt: new Date(prompt.createdAt),
            updatedAt: new Date(prompt.updatedAt)
          });
        } else {
          resolve(null);
        }
      };
    });
  }

  async savePrompt(prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt' | 'title'> & { title?: string }): Promise<Prompt> {
    if (!this.db) await this.init();
    
    const newPrompt: Prompt = {
      ...prompt,
      title: prompt.title || this.generateTitleFromContent(prompt.content),
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['prompts'], 'readwrite');
      const store = transaction.objectStore('prompts');
      const request = store.add(newPrompt);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(newPrompt);
    });
  }

  async updatePrompt(id: string, updates: Partial<Omit<Prompt, 'id' | 'createdAt'>>): Promise<Prompt | null> {
    if (!this.db) await this.init();
    
    const existingPrompt = await this.getPrompt(id);
    if (!existingPrompt) return null;
    
    const updatedPrompt: Prompt = {
      ...existingPrompt,
      ...updates,
      updatedAt: new Date()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['prompts'], 'readwrite');
      const store = transaction.objectStore('prompts');
      const request = store.put(updatedPrompt);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(updatedPrompt);
    });
  }

  async deletePrompt(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['prompts'], 'readwrite');
      const store = transaction.objectStore('prompts');
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async searchPrompts(query: string): Promise<Prompt[]> {
    const allPrompts = await this.getAllPrompts();
    const searchTerm = query.toLowerCase();
    
    return allPrompts.filter(prompt => 
      prompt.title.toLowerCase().includes(searchTerm) ||
      prompt.content.toLowerCase().includes(searchTerm) ||
      prompt.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  async getAllTags(): Promise<Tag[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tags'], 'readonly');
      const store = transaction.objectStore('tags');
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async saveTag(tag: Omit<Tag, 'id'>): Promise<Tag> {
    if (!this.db) await this.init();
    
    const newTag: Tag = {
      ...tag,
      id: crypto.randomUUID()
    };
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tags'], 'readwrite');
      const store = transaction.objectStore('tags');
      const request = store.add(newTag);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(newTag);
    });
  }

  async deleteTag(id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['tags'], 'readwrite');
      const store = transaction.objectStore('tags');
      const request = store.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async exportPrompts(): Promise<string> {
    const prompts = await this.getAllPrompts();
    return JSON.stringify(prompts, null, 2);
  }

  async importPrompts(data: string): Promise<void> {
    const prompts: Prompt[] = JSON.parse(data);
    
    for (const prompt of prompts) {
      await this.savePrompt({
        title: prompt.title,
        content: prompt.content,
        tags: prompt.tags,
        isHidden: prompt.isHidden
      });
    }
  }

  async generateShareLink(): Promise<string> {
    const prompts = await this.getAllPrompts();
    const data = JSON.stringify(prompts);
    const encoded = btoa(encodeURIComponent(data));
    const shareId = crypto.randomUUID();
    
    // Store the data temporarily in sessionStorage with the shareId
    sessionStorage.setItem(`share_${shareId}`, encoded);
    
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?share=${shareId}`;
  }

  async loadFromShareLink(shareId: string): Promise<Prompt[]> {
    // First try to get from sessionStorage (same session)
    const sessionData = sessionStorage.getItem(`share_${shareId}`);
    if (sessionData) {
      const decoded = decodeURIComponent(atob(sessionData));
      return JSON.parse(decoded);
    }
    
    // If not found, try to extract from URL hash (for cross-device sharing)
    const urlParams = new URLSearchParams(window.location.search);
    const hashData = urlParams.get('data');
    if (hashData) {
      const decoded = decodeURIComponent(atob(hashData));
      return JSON.parse(decoded);
    }
    
    throw new Error('Share data not found');
  }

  async generateSecureShareLink(): Promise<string> {
    const prompts = await this.getAllPrompts();
    const data = JSON.stringify(prompts);
    const encoded = btoa(encodeURIComponent(data));
    
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?data=${encoded}`;
  }
}

export const storage = new PromptStorage();