import { create } from 'zustand';
import { Prompt, PromptStore } from '../types';

export const usePromptStore = create<PromptStore>((set) => ({
  prompts: [],
  favorites: [],
  isGenerating: false,
  isNSFW: false,
  addPrompts: (prompts) =>
    set((state) => ({ prompts: [...state.prompts, ...prompts] })),
  addPrompt: (prompt) =>
    set((state) => ({ prompts: [...state.prompts, prompt] })),
  toggleFavorite: (id) =>
    set((state) => ({
      favorites: state.favorites.includes(id)
        ? state.favorites.filter((fid) => fid !== id)
        : [...state.favorites, id],
    })),
  removePrompt: (id) =>
    set((state) => ({
      prompts: state.prompts.filter((prompt) => prompt.id !== id),
    })),
  setGenerating: (status) =>
    set(() => ({ isGenerating: status })),
  setNSFW: (status) =>
    set(() => ({ isNSFW: status }))
}));