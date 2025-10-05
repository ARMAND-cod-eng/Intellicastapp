/**
 * Custom Preset Storage Service
 * Manages user-created preset configurations using localStorage
 */

export interface CustomPreset {
  id: string;
  name: string;
  description?: string;
  voice: string;
  speed: number;
  backgroundMusic: string;
  musicVolume: number;
  addIntroOutro: boolean;
  pauseAtPunctuation: boolean;
  pauseDuration: number;
  podcastStyle?: string;
  createdAt: string;
  tags?: string[];
}

const STORAGE_KEY = 'intellicast_custom_presets';

export class PresetStorage {
  /**
   * Get all custom presets
   */
  static getAll(): CustomPreset[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to load presets:', error);
      return [];
    }
  }

  /**
   * Save a new custom preset
   */
  static save(preset: Omit<CustomPreset, 'id' | 'createdAt'>): CustomPreset {
    const newPreset: CustomPreset = {
      ...preset,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };

    const presets = this.getAll();
    presets.push(newPreset);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));

    return newPreset;
  }

  /**
   * Update an existing preset
   */
  static update(id: string, updates: Partial<CustomPreset>): boolean {
    const presets = this.getAll();
    const index = presets.findIndex(p => p.id === id);

    if (index === -1) return false;

    presets[index] = { ...presets[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));

    return true;
  }

  /**
   * Delete a preset
   */
  static delete(id: string): boolean {
    const presets = this.getAll();
    const filtered = presets.filter(p => p.id !== id);

    if (filtered.length === presets.length) return false;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  }

  /**
   * Get a single preset by ID
   */
  static getById(id: string): CustomPreset | null {
    const presets = this.getAll();
    return presets.find(p => p.id === id) || null;
  }

  /**
   * Export presets as JSON
   */
  static export(): string {
    const presets = this.getAll();
    return JSON.stringify(presets, null, 2);
  }

  /**
   * Import presets from JSON
   */
  static import(jsonData: string): { success: boolean; count: number; error?: string } {
    try {
      const importedPresets = JSON.parse(jsonData);

      if (!Array.isArray(importedPresets)) {
        return { success: false, count: 0, error: 'Invalid format: expected array' };
      }

      const existingPresets = this.getAll();
      const merged = [...existingPresets, ...importedPresets];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

      return { success: true, count: importedPresets.length };
    } catch (error) {
      return { success: false, count: 0, error: 'Failed to parse JSON' };
    }
  }

  /**
   * Clear all custom presets
   */
  static clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
