import React, { useState, useEffect } from 'react';
import { X, Download, Upload, Key, ExternalLink } from 'lucide-react';
import { usePromptStore } from '../store/promptStore';
import { encrypt, decrypt } from '../lib/crypto';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const { prompts, favorites } = usePromptStore();

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      try {
        setApiKey(decrypt(savedKey));
      } catch (error) {
        console.error('Error decrypting API key');
      }
    }
  }, []);

  const saveApiKey = () => {
    try {
      const encryptedKey = encrypt(apiKey);
      localStorage.setItem('openai_api_key', encryptedKey);
      toast.success('API key saved successfully');
    } catch (error) {
      localStorage.setItem('openai_api_key', apiKey);
      toast.success('API key saved successfully');
    }
  };

  const exportData = () => {
    const data = {
      prompts,
      favorites,
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
    toast.success('Data exported successfully');
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        localStorage.setItem('prompts', JSON.stringify(data.prompts));
        localStorage.setItem('favorites', JSON.stringify(data.favorites));
        window.location.reload();
      } catch (error) {
        toast.error('Invalid backup file');
      }
    };
    reader.readAsText(file);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-purple-500/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="bg-purple-500/10 rounded-lg p-4">
              <p className="text-sm text-gray-300">
                This application requires an OpenAI API key to function. Your key is securely encrypted and stored only in your browser's local storage.
              </p>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-purple-500 
                         text-white rounded-lg hover:bg-purple-600 transition-colors duration-200"
              >
                <ExternalLink className="w-4 h-4" />
                Get your OpenAI API Key
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                OpenAI API Key
              </label>
              <form onSubmit={(e) => { e.preventDefault(); saveApiKey(); }}>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
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
              Export Data
            </button>
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 
                          bg-gray-800 text-white rounded-lg hover:bg-gray-700 
                          transition-colors duration-200 cursor-pointer">
              <Upload className="w-5 h-5" />
              Import Data
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