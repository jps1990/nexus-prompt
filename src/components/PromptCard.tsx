import React from 'react';
import { Heart, Copy, Trash, Wand2, Image } from 'lucide-react';
import { Prompt } from '../types';
import { usePromptStore } from '../store/promptStore';
import { generatePromptVariations } from '../lib/openai';
import toast from 'react-hot-toast';

interface PromptCardProps {
  prompt: Prompt;
}

export default function PromptCard({ prompt }: PromptCardProps) {
  const { toggleFavorite, favorites, removePrompt, addPrompts, isGenerating, setGenerating } = usePromptStore();
  const isFavorite = favorites.includes(prompt.id);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prompt.content);
    toast.success('Copied to clipboard!');
  };

  const generateVariations = async () => {
    if (isGenerating) return;

    try {
      setGenerating(true);
      const variations = await generatePromptVariations(prompt.content);
      
      const newPrompts = variations.map((variation: any) => ({
        id: crypto.randomUUID(),
        content: variation.prompt,
        description: variation.description,
        category: variation.category,
        tags: variation.tags,
        createdAt: new Date(),
        parentId: prompt.id,
      }));

      addPrompts(newPrompts);
      toast.success('Generated 10 new variations!');
    } catch (error) {
      toast.error('Failed to generate variations');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const openInHyperFlux = () => {
    window.open(`https://hyperfluxai.onrender.com/?prompt=${encodeURIComponent(prompt.content)}`, '_blank');
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/40 
                    transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <p className="text-gray-300 text-sm mb-2">{prompt.category}</p>
          <h3 className="text-white font-medium line-clamp-2">{prompt.content}</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleFavorite(prompt.id)}
            className={`p-2 rounded-lg transition-colors duration-200 
                     ${isFavorite ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
          >
            <Heart className="w-5 h-5" />
          </button>
          <button
            onClick={copyToClipboard}
            className="p-2 text-gray-400 hover:text-purple-400 rounded-lg transition-colors duration-200"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={generateVariations}
            disabled={isGenerating}
            className="p-2 text-gray-400 hover:text-purple-400 rounded-lg transition-colors duration-200
                     disabled:opacity-50"
          >
            <Wand2 className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openInHyperFlux}
            className="p-2 text-gray-400 hover:text-blue-400 rounded-lg transition-colors duration-200"
            title="Generate images with HyperFlux AI"
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            onClick={() => removePrompt(prompt.id)}
            className="p-2 text-gray-400 hover:text-red-400 rounded-lg transition-colors duration-200"
          >
            <Trash className="w-5 h-5" />
          </button>
        </div>
      </div>
      <p className="text-gray-400 text-sm">{prompt.description}</p>
      <div className="flex gap-2 mt-4 flex-wrap">
        {prompt.tags.map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 bg-purple-500/10 text-purple-300 rounded-full text-xs"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}