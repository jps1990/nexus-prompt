import React, { useState } from 'react';
import { Sparkles, Send, Loader2, AlertTriangle } from 'lucide-react';
import { usePromptStore } from '../store/promptStore';
import { generatePromptVariations, parseVariation } from '../lib/openai';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function PromptInput() {
  const [input, setInput] = useState('');
  const { 
    setGenerating, 
    isGenerating, 
    isNSFW, 
    setNSFW,
    sameLocation,
    setSameLocation,
    numVariations,
    setNumVariations,
    addPrompts
  } = usePromptStore();
  const [enhanceMode, setEnhanceMode] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    try {
      setGenerating(true);
      const stream = await generatePromptVariations(input.trim(), isNSFW);
      let buffer = '';
      let newPrompts = [];

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
          };
          newPrompts.push(newPrompt);
          buffer = buffer.replace(/<variation\d+>[\s\S]*?<\/variation\d+>/, '');
        }
      }

      if (newPrompts.length > 0) {
        addPrompts(newPrompts);
      }

      if (!enhanceMode) {
        setInput('');
      }
      toast.success(t(enhanceMode ? 'prompt.enhanced' : 'prompt.variationsGenerated'));
    } catch (error) {
      toast.error(t('prompt.variationsFailed'));
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex flex-col gap-2 mb-4">
        <button
          onClick={() => setEnhanceMode(!enhanceMode)}
          className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
                    ${enhanceMode 
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20 scale-105' 
                      : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}`}
        >
          <Sparkles className={`w-5 h-5 ${enhanceMode ? 'animate-pulse' : ''}`} />
          <span>{t(enhanceMode ? 'prompt.enhanceModeOn' : 'prompt.enhanceModeOff')}</span>
        </button>
        
        <div className="flex-1">
          {enhanceMode ? (
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <p className="text-sm text-purple-400">
                <span className="font-semibold">{t('prompt.enhanceModeOn')}:</span>
                <br />
                • {t('prompt.enhanceFeature1')}
                <br />
                • {t('prompt.enhanceFeature2')}
                <br />
                • {t('prompt.enhanceFeature3')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              {t('prompt.enhanceDescription')}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t(enhanceMode ? 'prompt.enhanceInput' : 'prompt.input')}
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
        <div className="flex items-center gap-4">
          <label className="flex items-center space-x-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={isNSFW}
              onChange={(e) => setNSFW(e.target.checked)}
              className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
            />
            <span>{t('prompt.allowNSFW')}</span>
          </label>

          <label className="flex items-center space-x-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={sameLocation}
              onChange={(e) => setSameLocation(e.target.checked)}
              className="rounded border-gray-600 text-purple-500 focus:ring-purple-500"
            />
            <span>{t('prompt.sameLocation')}</span>
          </label>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">{t('prompt.variations')}:</label>
            <select
              value={numVariations}
              onChange={(e) => setNumVariations(Number(e.target.value))}
              className="bg-gray-900 border border-gray-600 rounded text-sm text-gray-400 px-2 py-1"
            >
              {[1,2,3,4,5,6,7,8,9,10].map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </div>
        </div>

        {isNSFW && (
          <div className="flex items-center space-x-1 text-yellow-500">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs">{t('prompt.nsfwEnabled')}</span>
          </div>
        )}
      </div>
    </div>
  );
}