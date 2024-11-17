export interface Prompt {
  id: string;
  content: string;
  description: string;
  category: string;
  tags: string[];
  createdAt: Date;
  parentId?: string;
}

export interface PromptStore {
  prompts: Prompt[];
  favorites: string[];
  isGenerating: boolean;
  isNSFW: boolean;
  addPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  toggleFavorite: (id: string) => void;
  removePrompt: (id: string) => void;
  setGenerating: (status: boolean) => void;
  setNSFW: (status: boolean) => void;
}</content>