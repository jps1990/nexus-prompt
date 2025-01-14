import { Heart, Copy, Trash, Wand2, Image } from 'lucide-react';
import { Prompt } from '../types';
import { usePromptStore } from '../store/promptStore';
import { generatePromptVariations, parseVariation } from '../lib/openai';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface PromptCardProps {
  prompt: Prompt;
}

export default function PromptCard({ prompt }: PromptCardProps) {
  const { toggleFavorite, favorites, removePrompt, addPrompts, isGenerating, setGenerating } = usePromptStore();
  const isFavorite = favorites.includes(prompt.id);
  const { t } = useTranslation();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(prompt.content);
    toast.success(t('prompt.copied'));
  };

  const generateVariations = async () => {
    if (isGenerating) return;

    try {
      setGenerating(true);
      const stream = await generatePromptVariations(prompt.content);
      let buffer = '';
      const newPrompts = [];

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        buffer += content;

        const variation = parseVariation(buffer);
        if (variation) {
          const newPrompt = {
            id: crypto.randomUUID(),
            content: variation.prompt,
            description: variation.description,
            category: variation.category,
            tags: variation.tags,
            createdAt: new Date(),
            parentId: prompt.id,
          };
          newPrompts.push(newPrompt);
          buffer = buffer.replace(/<variation\d+>[\s\S]*?<\/variation\d+>/, '');
        }
      }

      if (newPrompts.length > 0) {
        addPrompts(newPrompts);
      }
      toast.success(t('prompt.variationsGenerated'));
    } catch (error) {
      toast.error(t('prompt.variationsFailed'));
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
            title={t('prompt.favorite')}
          >
            <Heart className="w-5 h-5" />
          </button>
          <button
            onClick={copyToClipboard}
            className="p-2 text-gray-400 hover:text-purple-400 rounded-lg transition-colors duration-200"
            title={t('prompt.copy')}
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={generateVariations}
            disabled={isGenerating}
            className="p-2 text-gray-400 hover:text-purple-400 rounded-lg transition-colors duration-200
                     disabled:opacity-50"
            title={t('prompt.enhanceTitle')}
          >
            <Wand2 className={`w-5 h-5 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={openInHyperFlux}
            className="p-2 text-gray-400 hover:text-blue-400 rounded-lg transition-colors duration-200"
            title={t('prompt.generateImages')}
          >
            <Image className="w-5 h-5" />
          </button>
          <button
            onClick={() => removePrompt(prompt.id)}
            className="p-2 text-gray-400 hover:text-red-400 rounded-lg transition-colors duration-200"
            title={t('prompt.delete')}
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