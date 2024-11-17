import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Prompt, PromptStore } from '../types';

export const usePromptStore = create<PromptStore>()(
  persist(
    (set) => ({
      prompts: [],
      favorites: [],
      isGenerating: false,
      isNSFW: false,
      sameLocation: true,
      addPrompts: (prompts) =>
        set((state) => ({ 
          prompts: [...state.prompts, ...prompts].sort((a, b) => 
            b.createdAt.getTime() - a.createdAt.getTime()
          )
        })),
      addPrompt: (prompt) =>
        set((state) => ({ 
          prompts: [prompt, ...state.prompts].sort((a, b) => 
            b.createdAt.getTime() - a.createdAt.getTime()
          )
        })),
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
      setGenerating: (status) => set(() => ({ isGenerating: status })),
      setNSFW: (status) => set(() => ({ isNSFW: status })),
      setSameLocation: (status) => set(() => ({ sameLocation: status })),
    }),
    {
      name: 'prompt-storage',
      partialize: (state) => ({ 
        prompts: state.prompts, 
        favorites: state.favorites,
        isNSFW: state.isNSFW,
        sameLocation: state.sameLocation
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convertir les dates string en objets Date
          state.prompts = state.prompts.map(prompt => ({
            ...prompt,
            createdAt: new Date(prompt.createdAt)
          }));
        }
      }
    }
  )
);