import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { secureStorage } from '../lib/secureStorage';

interface Prompt {
  id: string;
  content: string;
  description: string;
  category: string;
  tags: string[];
  createdAt: Date;
}

export type Provider = 'openai' | 'openrouter';

interface PromptStore {
  prompts: Prompt[];
  favorites: string[];
  isGenerating: boolean;
  isNSFW: boolean;
  sameLocation: boolean;
  numVariations: number;
  provider: Provider;
  openRouterModel: string;
  addPrompts: (prompts: Prompt[]) => void;
  setGenerating: (status: boolean) => void;
  setNSFW: (status: boolean) => void;
  setSameLocation: (status: boolean) => void;
  setNumVariations: (num: number) => void;
  setProvider: (provider: Provider) => void;
  setOpenRouterModel: (model: string) => void;
  toggleFavorite: (id: string) => void;
  removePrompt: (id: string) => void;
}

export const usePromptStore = create<PromptStore>()(
  persist(
    (set) => ({
      prompts: [],
      favorites: [],
      isGenerating: false,
      isNSFW: false,
      sameLocation: false,
      numVariations: 3,
      provider: 'openai',
      openRouterModel: '',
      addPrompts: (prompts) => set((state) => ({ 
        prompts: [...state.prompts, ...prompts] 
      })),
      setGenerating: (status) => set({ isGenerating: status }),
      setNSFW: (status) => set({ isNSFW: status }),
      setSameLocation: (status) => set({ sameLocation: status }),
      setNumVariations: (num) => set({ numVariations: num }),
      setProvider: (provider) => set({ provider }),
      setOpenRouterModel: (model) => set({ openRouterModel: model }),
      toggleFavorite: (id) => set((state) => ({
        favorites: state.favorites.includes(id)
          ? state.favorites.filter(fid => fid !== id)
          : [...state.favorites, id]
      })),
      removePrompt: (id) => set((state) => ({
        prompts: state.prompts.filter(prompt => prompt.id !== id)
      })),
    }),
    {
      name: 'prompt-storage',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        prompts: state.prompts,
        favorites: state.favorites,
        isNSFW: state.isNSFW,
        sameLocation: state.sameLocation,
        numVariations: state.numVariations,
        provider: state.provider,
        openRouterModel: state.openRouterModel,
      }),
    }
  )
);