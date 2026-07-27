// Configuration system for PromptVault
// This allows runtime control of features without recompilation

export interface AppConfig {
  features: {
    hiddenPrompts: boolean;
  };
  security: {
    defaultPassword: string;
  };
}

// Default configuration
const defaultConfig: AppConfig = {
  features: {
    hiddenPrompts: false, // Default to OFF
  },
  security: {
    defaultPassword: 'foobar',
  },
};

// Load configuration from localStorage or use defaults
function loadConfig(): AppConfig {
  try {
    const storedConfig = localStorage.getItem('promptvault_config');
    if (storedConfig) {
      const parsed = JSON.parse(storedConfig);
      return { ...defaultConfig, ...parsed };
    }
  } catch (error) {
    console.warn('Failed to load configuration from localStorage:', error);
  }
  
  return defaultConfig;
}

// Save configuration to localStorage
function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem('promptvault_config', JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save configuration to localStorage:', error);
  }
}

// Get current configuration
export function getConfig(): AppConfig {
  return loadConfig();
}

// Update configuration
export function updateConfig(updates: Partial<AppConfig>): void {
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...updates };
  saveConfig(newConfig);
}

// Convenience functions for specific features
export function isHiddenPromptsEnabled(): boolean {
  return getConfig().features.hiddenPrompts;
}

export function getDefaultPassword(): string {
  return getConfig().security.defaultPassword;
}

// Configuration management functions
export function setHiddenPromptsEnabled(enabled: boolean): void {
  updateConfig({
    features: {
      ...getConfig().features,
      hiddenPrompts: enabled,
    },
  });
}

export function setDefaultPassword(password: string): void {
  updateConfig({
    security: {
      ...getConfig().security,
      defaultPassword: password,
    },
  });
}

// Reset configuration to defaults
export function resetConfig(): void {
  localStorage.removeItem('promptvault_config');
}

// Export the configuration instance
export const config = {
  get: getConfig,
  update: updateConfig,
  reset: resetConfig,
  isHiddenPromptsEnabled,
  getDefaultPassword,
  setHiddenPromptsEnabled,
  setDefaultPassword,
}; 