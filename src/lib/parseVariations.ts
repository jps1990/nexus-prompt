export interface ParsedVariation {
  prompt: string;
  description: string;
  category: string;
  tags: string[];
}

type Field = 'prompt' | 'description' | 'category' | 'tags';

// "prompt:", "**prompt:**", "**prompt**:", "- prompt:", "1. Prompt :" ...
const FIELD_RE = /^[ \t>*_#-]*(?:\d+[.)][ \t]*)?[*_]*(prompt|description|category|tags)[ \t]*(?:\*+|_+)?[ \t]*[:：][ \t]*(?:\*+|_+)?[ \t]*/gim;
const PROMPT_START_RE = /(?=^[ \t>*_#-]*(?:\d+[.)][ \t]*)?[*_]*prompt[ \t]*(?:\*+|_+)?[ \t]*[:：])/im;

const cleanValue = (value: string) =>
  value
    .trim()
    .replace(/^[*_`"“”]+|[*_`"“”]+$/g, '')
    .trim();

const parseTags = (raw: string): string[] => {
  const value = raw.trim();
  let tags: unknown[] | null = null;

  if (value.startsWith('[')) {
    for (const candidate of [value, value.replace(/'/g, '"')]) {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed)) {
          tags = parsed;
          break;
        }
      } catch {
        // on retombe sur le découpage par virgules
      }
    }
  }

  const list = tags ?? value.replace(/^\[|\]$/g, '').split(/[,;\n]/);
  return list
    .map((tag) => String(tag).replace(/^[\s#"'`*_]+|[\s"'`*_]+$/g, ''))
    .filter(Boolean)
    .slice(0, 10);
};

const parseBlock = (block: string): ParsedVariation | null => {
  const matches = [...block.matchAll(FIELD_RE)];
  if (matches.length === 0) return null;

  const fields: Partial<Record<Field, string>> = {};
  matches.forEach((match, i) => {
    const field = match[1].toLowerCase() as Field;
    const start = (match.index ?? 0) + match[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : block.length;
    // On garde la première occurrence de chaque champ
    fields[field] ??= block.slice(start, end);
  });

  const prompt = cleanValue(fields.prompt ?? '');
  if (!prompt) return null;

  return {
    prompt,
    description: cleanValue(fields.description ?? ''),
    category: cleanValue(fields.category ?? ''),
    tags: parseTags(fields.tags ?? ''),
  };
};

// Extrait toutes les variations d'une réponse complète, quel que soit le modèle :
// balises <variationN> (fermées ou non), sinon un bloc par champ "prompt:".
export const parseVariations = (text: string): ParsedVariation[] => {
  const cleaned = text
    .replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '')
    .replace(/<think(?:ing)?>[\s\S]*$/i, '');

  const tagged = [...cleaned.matchAll(/<variation\d*>([\s\S]*?)(?:<\/variation\d*>|(?=<variation\d*>)|$)/gi)]
    .map((m) => m[1]);
  const blocks = tagged.length > 0 ? tagged : cleaned.split(PROMPT_START_RE);

  return blocks
    .map(parseBlock)
    .filter((variation): variation is ParsedVariation => variation !== null);
};
