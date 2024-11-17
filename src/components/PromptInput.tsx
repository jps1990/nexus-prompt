import React, { useState } from 'react';
import { Sparkles, Send, Loader2, AlertTriangle } from 'lucide-react';
import { usePromptStore } from '../store/promptStore';
import { generatePromptVariations, parseVariation, rateLimiter } from '../lib/openai';
import toast from 'react-hot-toast';

export default function PromptInput() {
  const [input, setInput] = useState('');
  const { addPrompt, setGenerating, isGenerating, isNSFW, setNSFW } = usePromptStore();
  const [enhanceMode, setEnhanceMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    if (enhanceMode && !rateLimiter.canEnhance()) {
      toast.error('Enhance is limited to 2 times per minute');
      return;
    }

    try {
      setGenerating(true);
      if (enhanceMode) {
        rateLimiter.trackEnhance();
      }

      const stream = await generatePromptVariations(input.trim(), isNSFW);
      let buffer = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        buffer += content;

        // Try to parse complete variations as they come in
        const variation = parseVariation(buffer);
        if (variation) {
          addPrompt({
            id: crypto.randomUUID(),
            content: variation.prompt,
            description: variation.description,
            category: variation.category,
            tags: variation.tags,
            createdAt: new Date(),
          });
          buffer = buffer.replace(/<variation\d+>[\s\S]*?<\/variation\d+>/, '');
        }
      }

      if (!enhanceMode) {
        setInput('');
      }
      toast.success(enhanceMode ? 'Prompt enhanced!' : 'Generated new variations!');
    } catch (error) {
      toast.error('Failed to generate variations. Please try again.');
      console.error(error);
    } finally {
      setGenerating(false);
      setEnhanceMode(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <button
          type="button"
          onClick={() => setEnhanceMode(true)}
          disabled={isGenerating || !rateLimiter.canEnhance()}
          className={`absolute left-4 p-1 transition-colors duration-200
                   ${enhanceMode 
                     ? 'text-yellow-400' 
                     : 'text-purple-400 hover:text-purple-300'} 
                   disabled:opacity-50`}
        >
          <Sparkles className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={enhanceMode ? "Enhance this prompt..." : "Enter your base prompt..."}
          disabled={isGenerating}
          className="w-full px-12 py-4 bg-gray-900 border border-purple-500/30 rounded-xl 
                   text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                   focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isGenerating}
          className="absolute right-4 p-1 text-purple-400 hover:text-purple-300 
                   transition-colors duration-200 disabled:opacity-50"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>

      <div className="flex items-center justify-between px-4">
        <label className="flex items-center space-x-2 text-sm text-gray-400">
          <input
            type="checkbox"
            checked={isNSFW}
            onChange={(e) => setNSFW(e.target.checked)}
            className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
          />
          <span>Allow NSFW content</span>
        </label>
        {isNSFW && (
          <div className="flex items-center space-x-1 text-yellow-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">NSFW content enabled</span>
          </div>
        )}
      </div>
    </div>
  );
}