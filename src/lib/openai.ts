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

// Modèles gratuits à essayer dans l'ordre : le modèle choisi d'abord, puis les autres (grand contexte en premier)
const openRouterCandidates = async () => {
  const { openRouterModel, setOpenRouterModel } = usePromptStore.getState();
  const models = await fetchFreeOpenRouterModels();
  if (models.length === 0) throw new Error('No free OpenRouter model available.');
  const chosen = models.find((m) => m.id === openRouterModel);
  const others = models
    .filter((m) => m !== chosen)
    .sort((a, b) => b.context_length - a.context_length);
  const ordered = chosen ? [chosen, ...others] : others;
  if (!chosen) setOpenRouterModel(ordered[0].id);
  return ordered.slice(0, 4).map((m) => m.id);
};

// Erreurs propres à un modèle gratuit (indisponible, saturé, format refusé) : on passe au suivant
const isModelError = (error: unknown) => {
  const status = (error as { status?: number })?.status;
  return status === 400 || status === 404 || status === 408 || status === 429 || (status !== undefined && status >= 500);
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
  const system = systemPrompt(isNSFW, sameLocation, numVariations);

  if (provider === 'openai') {
    return openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: basePrompt }
      ],
      temperature: 1,
      stream: true
    });
  }

  // Beaucoup de modèles gratuits refusent le rôle "system" : tout passe dans un seul message utilisateur
  const messages = [{ role: 'user' as const, content: `${system}\n\nPrompt to expand:\n${basePrompt}` }];
  let lastError: unknown;
  for (const model of await openRouterCandidates()) {
    try {
      return await openai.chat.completions.create({ model, messages, temperature: 1, stream: true });
    } catch (error) {
      lastError = error;
      console.warn(`OpenRouter model ${model} failed, trying the next one:`, error);
      if (!isModelError(error)) break;
    }
  }
  throw lastError;
};
