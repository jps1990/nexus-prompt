import React, { useState } from 'react';
import { Brain, Settings, Coffee } from 'lucide-react';
import SettingsModal from './SettingsModal';

export default function Header() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="w-full border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-lg fixed top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-purple-500" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                NexusPrompt
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <a
                href="https://buymeacoffee.com/sunboom"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-[#FFDD00] text-gray-900 rounded-lg hover:bg-[#FFDD00]/90 transition-colors duration-200"
              >
                <Coffee className="w-5 h-5" />
                <span className="font-medium">Buy me a coffee</span>
              </a>
              <button 
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-400 hover:text-purple-400 rounded-lg transition-colors duration-200"
              >
                <Settings className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}