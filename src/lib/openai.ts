import OpenAI from 'openai';
import { decrypt } from './crypto';

const getApiKey = () => {
  const savedKey = localStorage.getItem('openai_api_key');
  if (savedKey) {
    try {
      return decrypt(savedKey);
    } catch (error) {
      console.error('Error decrypting API key');
      return null;
    }
  }
  return import.meta.env.VITE_OPENAI_API_KEY;
};

const createOpenAIClient = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not found. Please add your API key in settings.');
  }
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true
  });
};

class RateLimiter {
  private lastEnhance: number = 0;
  private enhanceCount: number = 0;
  private readonly resetInterval: number = 60000;

  canEnhance(): boolean {
    const now = Date.now();
    if (now - this.lastEnhance >= this.resetInterval) {
      this.enhanceCount = 0;
      this.lastEnhance = now;
    }
    return this.enhanceCount < 2;
  }

  trackEnhance(): void {
    this.enhanceCount++;
    this.lastEnhance = Date.now();
  }
}

export const rateLimiter = new RateLimiter();

const systemPrompt = (isNSFW: boolean) => `You are an expert creative director and art director specializing in generating highly detailed, professional prompts. 
Your task is to create 10 unique, comprehensive variations of the given prompt, each wrapped in numbered variation tags.

Format each variation as:
<variation1>
prompt: [detailed prompt with artistic direction]
description: [comprehensive explanation of the creative vision]
category: [photography/digital art/3D/illustration/etc]
tags: ["tag1", "tag2", "tag3", "tag4", "tag5"]
</variation1>

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
- ${isNSFW ? 'NSFW content is allowed but must be tasteful and artistic' : 'Keep all content family-friendly'}
- Use professional terminology and industry-standard language
- Each variation should be completely unique in approach
- Include specific artistic references when relevant
- Focus on creating cinematic and visually striking scenes
- Add emotional and narrative elements to enhance the concept

Respond ONLY with the variations, no additional text.`;

export const generatePromptVariations = async (basePrompt: string, isNSFW: boolean = false) => {
  const openai = createOpenAIClient();
  
  return openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt(isNSFW) },
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