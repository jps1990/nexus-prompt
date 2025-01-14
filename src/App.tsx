import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Footer from './components/Footer';
import PromptInput from './components/PromptInput';
import PromptCard from './components/PromptCard';
import { usePromptStore } from './store/promptStore';
import { useTranslation } from 'react-i18next';

function App() {
  const { prompts } = usePromptStore();
  const { t } = useTranslation();
  const hasApiKey = localStorage.getItem('openai_api_key');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Toaster position="top-center" />
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r 
                        from-purple-400 to-purple-600 bg-clip-text text-transparent">
            {t('app.title')}
          </h2>
          <p className="text-center text-gray-400 max-w-2xl mx-auto mb-8">
            {t('prompt.description')}
          </p>
          {!hasApiKey && (
            <div className="max-w-2xl mx-auto mb-8 p-4 bg-purple-500/10 rounded-lg text-center">
              <p className="text-gray-300 mb-2">
                {t('settings.apiKeyRequired')}
              </p>
            </div>
          )}
          <PromptInput />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} />
          ))}
        </div>

        {prompts.length === 0 && (
          <div className="text-center text-gray-400 mt-12">
            <p className="text-lg">{t('prompt.empty')}</p>
            <p className="text-sm mt-2">{t('prompt.emptyDescription')}</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;