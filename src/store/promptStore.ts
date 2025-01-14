import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Prompt {
  id: string;
  content: string;
  description: string;
  category: string;
  tags: string[];
  createdAt: Date;
}

interface PromptStore {
  prompts: Prompt[];
  favorites: string[];
  isGenerating: boolean;
  isNSFW: boolean;
  sameLocation: boolean;
  numVariations: number;
  addPrompts: (prompts: Prompt[]) => void;
  setGenerating: (status: boolean) => void;
  setNSFW: (status: boolean) => void;
  setSameLocation: (status: boolean) => void;
  setNumVariations: (num: number) => void;
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
      addPrompts: (prompts) => set((state) => ({ 
        prompts: [...state.prompts, ...prompts] 
      })),
      setGenerating: (status) => set({ isGenerating: status }),
      setNSFW: (status) => set({ isNSFW: status }),
      setSameLocation: (status) => set({ sameLocation: status }),
      setNumVariations: (num) => set({ numVariations: num }),
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
      partialize: (state) => ({
        prompts: state.prompts,
        favorites: state.favorites,
        isNSFW: state.isNSFW,
        sameLocation: state.sameLocation,
        numVariations: state.numVariations,
      }),
    }
  )
);