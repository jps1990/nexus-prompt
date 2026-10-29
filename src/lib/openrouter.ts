export const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
}

interface OpenRouterModelsResponse {
  data: Array<{
    id: string;
    name: string;
    context_length: number;
    architecture?: { output_modalities?: string[] };
    pricing?: { prompt?: string; completion?: string; request?: string };
  }>;
}

const isZero = (value?: string) => value === undefined || Number(value) === 0;

let cache: OpenRouterModel[] | null = null;

// Récupère la liste des modèles OpenRouter et ne garde que ceux gratuits qui génèrent du texte
export const fetchFreeOpenRouterModels = async (force = false): Promise<OpenRouterModel[]> => {
  if (cache && !force) return cache;

  const response = await fetch(`${OPENROUTER_BASE_URL}/models`);
  if (!response.ok) {
    throw new Error(`OpenRouter models request failed (${response.status})`);
  }
  const { data } = (await response.json()) as OpenRouterModelsResponse;

  cache = data
    .filter((model) =>
      model.pricing &&
      Number(model.pricing.prompt) === 0 &&
      Number(model.pricing.completion) === 0 &&
      isZero(model.pricing.request) &&
      (model.architecture?.output_modalities?.includes('text') ?? true)
    )
    .map(({ id, name, context_length }) => ({ id, name, context_length }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return cache;
};
