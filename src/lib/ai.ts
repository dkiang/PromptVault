// AI integration for PromptVault
// Note: This requires an OpenAI API key to be set in the environment

interface TagSuggestionResponse {
  tags: string[];
  confidence: number;
}

export class AIService {
  private apiKey: string | null = null;
  private isEnabled: boolean = false;

  constructor() {
    // Check if OpenAI API key is available
    this.apiKey = this.getAPIKey();
    this.isEnabled = !!this.apiKey;
  }

  private getAPIKey(): string | null {
    // Only access localStorage in the browser
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('openai_api_key') || null;
  }

  public isAIAvailable(): boolean {
    return this.isEnabled;
  }

  public setAPIKey(key: string): void {
    this.apiKey = key;
    this.isEnabled = !!key;
    if (typeof window !== 'undefined') {
      localStorage.setItem('openai_api_key', key);
    }
  }

  public clearAPIKey(): void {
    this.apiKey = null;
    this.isEnabled = false;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('openai_api_key');
    }
  }

  public async suggestTags(promptContent: string, existingTags: string[] = [], allTags: string[] = []): Promise<string[]> {
    if (!this.isEnabled || !this.apiKey) {
      return [];
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant that suggests relevant tags for AI prompts. 
              Analyze the prompt content and suggest 3-8 relevant, specific tags.
              Tags should be:
              - Single words or short phrases (2-3 words max)
              - Lowercase
              - Specific and descriptive
              - Relevant to the prompt's purpose or domain
              
              If existing tags are provided, try to suggest additional tags that complement them.
              If a list of all existing tags is provided, prefer or match your suggestions to those tags wherever possible (including synonyms).
              Return only the tags as a comma-separated list, no explanations.`
            },
            {
              role: 'user',
              content: `Prompt: "${promptContent}"
              ${existingTags.length > 0 ? `Existing tags: ${existingTags.join(', ')}` : ''}
              ${allTags.length > 0 ? `All tags in this user's collection: ${allTags.join(', ')}` : ''}
              
              Suggest relevant tags:`
            }
          ],
          max_tokens: 100,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const suggestedTags = data.choices[0]?.message?.content?.trim() || '';
      
      // Parse the comma-separated tags and clean them up
      return suggestedTags
        .split(',')
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 0 && tag.length <= 20) // Filter out empty or too long tags
        .slice(0, 8); // Limit to 8 tags max

    } catch (error) {
      console.error('Failed to get tag suggestions:', error);
      return [];
    }
  }
}

// Export a function to get the AIService instance only in the browser
export function getAIService(): AIService | null {
  if (typeof window !== 'undefined') {
    return new AIService();
  }
  return null;
} 