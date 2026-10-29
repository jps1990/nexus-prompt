import OpenAI from 'openai';
import { decrypt, isLegacyCiphertext } from './crypto';
import { usePromptStore, Provider } from '../store/promptStore';
import { OPENROUTER_BASE_URL, fetchFreeOpenRouterModels } from './openrouter';

export const API_KEY_STORAGE: Record<Provider, string> = {
  openai: 'openai_api_key',
  openrouter: 'openrouter_api_key',
};

const getSavedKey = (provider: Provider) => {
  const savedKey = localStorage.getItem(API_KEY_STORAGE[provider]);
  // Une clé chiffrée par l'ancienne version ne peut plus être lue : on la considère absente
  return savedKey && !isLegacyCiphertext(savedKey) ? savedKey : null;
};

export const hasApiKey = (provider: Provider) => !!getSavedKey(provider) ||
  (provider === 'openai' && !!import.meta.env.VITE_OPENAI_API_KEY);

export const readApiKey = async (provider: Provider) => {
  const savedKey = getSavedKey(provider);
  if (savedKey) {
    try {
      return await decrypt(savedKey);
    } catch (error) {
      console.error('Error decrypting API key:', error);
    }
  }
  return provider === 'openai' ? import.meta.env.VITE_OPENAI_API_KEY : undefined;
};

const createClient = async (provider: Provider) => {
  const apiKey = await readApiKey(provider);
  if (!apiKey) {
    const name = provider === 'openrouter' ? 'OpenRouter' : 'OpenAI';
    throw new Error(`${name} API key not found. Please add your API key in settings.`);
  }
  if (provider === 'openrouter') {
    return new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        'HTTP-Referer': window.location.origin,
        'X-Title': 'NexusPrompt'
      }
    });
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

// Modèle OpenRouter choisi, sinon le premier modèle gratuit disponible
const resolveOpenRouterModel = async () => {
  const { openRouterModel, setOpenRouterModel } = usePromptStore.getState();
  const models = await fetchFreeOpenRouterModels();
  if (openRouterModel && models.some((m) => m.id === openRouterModel)) return openRouterModel;
  if (models.length === 0) throw new Error('No free OpenRouter model available.');
  setOpenRouterModel(models[0].id);
  return models[0].id;
};

const systemPrompt = (isNSFW: boolean, sameLocation: boolean, numVariations: number) => `You are an expert creative director and art director specializing in generating highly detailed, professional prompts. 
Your task is to create ${numVariations} unique, comprehensive variations of the given prompt, each wrapped in numbered variation tags.

Format each variation as:
<variation1>
prompt: [detailed prompt with artistic direction]
description: [comprehensive explanation of the creative vision]
category: [photography/digital art/3D/illustration/etc]
tags: ["tag1", "tag2", "tag3", "tag4", "tag5"]
</variation1>

${sameLocation 
  ? 'All 10 variations should be set in the same location or environment to explore different creative possibilities within that space.'
  : 'Each variation should be set in a different location or environment to explore diverse settings and atmospheres.'}

For each variation, include specific details about:
1. Subject & Composition:
   - Main subject details (pose, expression, attitude, clothing if applicable)
   - Positioning and framing
   - Background elements and environment
   - Spatial relationships and depth

2. Technical Specifications:
   - Camera settings (if photography)
   - Lens choice and focal length
   - Rendering style (if digital art)
   - Technical execution details

3. Lighting & Atmosphere:
   - Main light source and direction
   - Secondary lighting and fill
   - Shadows and highlights
   - Mood and atmospheric effects

4. Color & Style:
   - Color palette and scheme
   - Artistic influences
   - Texture and material qualities
   - Post-processing or effects

5. Additional Elements:
   - Props and supporting elements
   - Environmental details
   - Special effects or unique features
   - Time of day or seasonal elements

Guidelines:
- Make each variation twice as detailed as a standard prompt
- ${isNSFW ? 'NSFW content is allowed but must be tasteful and artistic' : 'Keep all content almost family-friendly'}
- Use professional terminology and industry-standard language
- Each variation should be completely unique in approach
- Include specific artistic references when relevant
- Focus on creating cinematic and visually striking scenes
- Add emotional and narrative elements to enhance the concept

Respond ONLY with the variations, no additional text.`;

export const generatePromptVariations = async (basePrompt: string, isNSFW: boolean = false) => {
  const { sameLocation, numVariations, provider } = usePromptStore.getState();
  const openai = await createClient(provider);
  const model = provider === 'openrouter' ? await resolveOpenRouterModel() : 'gpt-3.5-turbo';

  return openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt(isNSFW, sameLocation, numVariations) },
      { role: 'user', content: basePrompt }
    ],
    temperature: 1,
    stream: true
  });
};

export const parseVariation = (text: string): { 
  prompt: string; 
  description: string; 
  category: string;
  tags: string[];
} | null => {
  const variationMatch = text.match(/<variation\d+>([\s\S]*?)<\/variation\d+>/);
  if (!variationMatch) return null;

  const content = variationMatch[1];
  return {
    prompt: content.match(/prompt: (.*)/)?.[1]?.trim() || '',
    description: content.match(/description: (.*)/)?.[1]?.trim() || '',
    category: content.match(/category: (.*)/)?.[1]?.trim() || '',
    tags: JSON.parse(content.match(/tags: (\[.*?\])/)?.[1] || '[]'),
  };
};