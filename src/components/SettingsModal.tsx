import React, { useState, useEffect } from 'react';
import { X, Download, Upload, Key, ExternalLink, Globe, Server, Cpu, RefreshCw } from 'lucide-react';
import { usePromptStore, Provider } from '../store/promptStore';
import { API_KEY_STORAGE, readApiKey } from '../lib/openai';
import { fetchFreeOpenRouterModels, OpenRouterModel } from '../lib/openrouter';
import { encrypt } from '../lib/crypto';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [freeModels, setFreeModels] = useState<OpenRouterModel[]>([]);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [modelsError, setModelsError] = useState(false);
  const { prompts, favorites, provider, setProvider, openRouterModel, setOpenRouterModel } = usePromptStore();
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    readApiKey(provider).then((key) => {
      if (!cancelled) setApiKey(key && localStorage.getItem(API_KEY_STORAGE[provider]) ? key : '');
    });
    return () => { cancelled = true; };
  }, [provider]);

  const applyModels = (models: OpenRouterModel[]) => {
    setFreeModels(models);
    setModelsError(false);
    const { openRouterModel: current } = usePromptStore.getState();
    if (models.length > 0 && !models.some((m) => m.id === current)) {
      setOpenRouterModel(models[0].id);
    }
  };

  const onModelsError = (error: unknown) => {
    console.error('Error fetching OpenRouter models:', error);
    setModelsError(true);
    toast.error(t('settings.modelsFetchFailed'));
  };

  useEffect(() => {
    if (!open || provider !== 'openrouter') return;
    let cancelled = false;
    fetchFreeOpenRouterModels()
      .then((models) => { if (!cancelled) applyModels(models); })
      .catch((error) => { if (!cancelled) onModelsError(error); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider]);

  const refreshModels = async () => {
    setRefreshingModels(true);
    try {
      applyModels(await fetchFreeOpenRouterModels(true));
    } catch (error) {
      onModelsError(error);
    } finally {
      setRefreshingModels(false);
    }
  };

  const loadingModels = refreshingModels || (freeModels.length === 0 && !modelsError);

  const saveApiKey = async () => {
    try {
      localStorage.setItem(API_KEY_STORAGE[provider], await encrypt(apiKey));
      toast.success(t('settings.apiKeySaved'));
    } catch (error) {
      console.error('Error encrypting API key:', error);
      toast.error(t('settings.apiKeySaveFailed'));
    }
  };

  const exportData = () => {
    const store = usePromptStore.getState();
    const data = {
      prompts,
      favorites,
      isNSFW: store.isNSFW,
      sameLocation: store.sameLocation,
      numVariations: store.numVariations,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexusprompt-backup.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t('settings.dataExported'));
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        // Support des anciens formats d'export
        const isLegacyFormat = !Object.prototype.hasOwnProperty.call(data, 'isNSFW') && !Object.prototype.hasOwnProperty.call(data, 'sameLocation');
        
        if (isLegacyFormat) {
          // Si c'est un ancien format, on vérifie juste les prompts et favorites
          if (!Array.isArray(data.prompts) && !Array.isArray(data.favorites)) {
            throw new Error('Invalid backup format');
          }
        } else {
          // Pour les nouveaux formats, on vérifie tout
          if (!Array.isArray(data.prompts)) {
            throw new Error('Invalid prompts data');
          }
        }

        // Convertir les dates string en objets Date
        const promptsWithDates = (data.prompts || []).map((prompt: { createdAt: string }) => ({
          ...prompt,
          createdAt: new Date(prompt.createdAt)
        }));

        // Garder les paramètres existants si on importe un ancien format
        const currentState = usePromptStore.getState();
        
        usePromptStore.setState({
          prompts: promptsWithDates,
          favorites: data.favorites || [],
          // Garder les paramètres actuels si on importe un ancien format
          isNSFW: isLegacyFormat ? currentState.isNSFW : (data.isNSFW || false),
          sameLocation: isLegacyFormat ? currentState.sameLocation : (data.sameLocation || false),
          numVariations: isLegacyFormat ? currentState.numVariations : (data.numVariations || 3)
        });

        toast.success(t('settings.dataImported'));
        window.location.reload();
      } catch (error) {
        console.error('Import error:', error);
        toast.error(t('settings.invalidBackup'));
      }
    };
    reader.readAsText(file);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-purple-500/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">{t('settings.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              {t('settings.language')}
            </label>
            <div className="flex gap-2 items-center">
              <Globe className="w-5 h-5 text-gray-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                className="flex-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 
                         text-white focus:outline-none focus:ring-2 
                         focus:ring-purple-500 focus:border-transparent"
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              {t('settings.provider')}
            </label>
            <div className="flex gap-2 items-center">
              <Server className="w-5 h-5 text-gray-400" />
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as Provider)}
                className="flex-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 
                         text-white focus:outline-none focus:ring-2 
                         focus:ring-purple-500 focus:border-transparent"
              >
                <option value="openai">OpenAI</option>
                <option value="openrouter">{t('settings.openRouterFree')}</option>
              </select>
            </div>
          </div>

          {provider === 'openrouter' && (
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                {t('settings.model')} ({freeModels.length})
              </label>
              <div className="flex gap-2 items-center">
                <Cpu className="w-5 h-5 text-gray-400" />
                <select
                  value={openRouterModel}
                  onChange={(e) => setOpenRouterModel(e.target.value)}
                  disabled={loadingModels || freeModels.length === 0}
                  className="flex-1 min-w-0 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 
                           text-white focus:outline-none focus:ring-2 
                           focus:ring-purple-500 focus:border-transparent disabled:opacity-50"
                >
                  {freeModels.length === 0 && (
                    <option value="">{loadingModels ? t('settings.loadingModels') : t('settings.noModels')}</option>
                  )}
                  {freeModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} · {Math.round(model.context_length / 1000)}k
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={refreshModels}
                  disabled={loadingModels}
                  title={t('settings.refreshModels')}
                  className="p-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 
                           transition-colors duration-200 disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${loadingModels ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-purple-500/10 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                {provider === 'openrouter' ? t('settings.openRouterKeyDescription') : t('settings.apiKeyDescription')}
              </p>
              <a
                href={provider === 'openrouter' ? 'https://openrouter.ai/settings/keys' : 'https://platform.openai.com/api-keys'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-purple-500 
                         text-white rounded-lg hover:bg-purple-600 transition-colors duration-200"
              >
                <ExternalLink className="w-4 h-4" />
                {provider === 'openrouter' ? t('settings.getOpenRouterKey') : t('settings.getApiKey')}
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                {provider === 'openrouter' ? t('settings.openRouterKeyLabel') : t('settings.apiKeyLabel')}
              </label>
              <form onSubmit={(e) => { e.preventDefault(); saveApiKey(); }}>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={provider === 'openrouter' ? 'sk-or-...' : 'sk-...'}
                    className="flex-1 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 
                             text-white placeholder-gray-400 focus:outline-none focus:ring-2 
                             focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 
                             transition-colors duration-200"
                  >
                    <Key className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={exportData}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                       bg-gray-800 text-white rounded-lg hover:bg-gray-700 
                       transition-colors duration-200"
            >
              <Download className="w-5 h-5" />
              {t('settings.exportData')}
            </button>
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                          bg-gray-800 text-white rounded-lg hover:bg-gray-700 
                          transition-colors duration-200 cursor-pointer">
              <Upload className="w-5 h-5" />
              {t('settings.importData')}
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}