import React from 'react';
import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="w-full py-4 px-4 mt-8 border-t border-gray-800">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <span>{t('app.footer.madeWith')}</span>
          <Heart className="w-4 h-4 text-red-500 fill-red-500" />
          <span>{t('app.footer.by')}</span>
          <a 
            href="https://www.sunboom.ca" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            JP Sunboom
          </a>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://www.buymeacoffee.com/sunboom"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-500 hover:text-yellow-400 transition-colors"
          >
            Buy me a coffee
          </a>
          <a
            href="https://www.sunboom.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            {t('app.footer.portfolio')}
          </a>
        </div>
      </div>
    </footer>
  );
} 