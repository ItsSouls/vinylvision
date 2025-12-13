import { ScanMode } from '../types';

interface GeminiExtraction {
  artist?: string;
  title?: string;
  catalogNumber?: string;
  format?: string;
  confidence?: number;
  notes?: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';

const BASE_PROMPT = `You are an assistant that reads vinyl record artwork (spines and covers) from a photo.
Return a strict JSON object with the fields:
{
  "artist": string | null,
  "title": string | null,
  "catalogNumber": string | null,
  "format": string | null,
  "confidence": number (0-1),
  "notes": string | null
}

Do not add Markdown or text outside of JSON.
Use uppercase catalog numbers (e.g. "SHVL 804").`;

const MODE_PROMPTS: Record<ScanMode, string> = {
  [ScanMode.SPINE]:
    'Analyze this image of a record SPINE. Prioritize finding the catalog number and any artist/title text printed along the spine.',
  [ScanMode.COVER]:
    'Analyze this image of a record COVER. Focus heavily on extracting ARTIST NAME and ALBUM TITLE. Catalog numbers on covers are rare, so only include if clearly visible.',
};

const parseDataUrl = (image: string) => {
  const match = image.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error('Formato de imagen no soportado. Usa data URLs base64.');
  }
  return { mime: match[1], data: match[2] };
};

export const extractAlbumData = async (
  imageDataUrl: string,
  mode: ScanMode
): Promise<GeminiExtraction> => {
  if (!GEMINI_API_KEY) {
    throw new Error('Falta la clave de Gemini (VITE_GEMINI_API_KEY).');
  }

  const { mime, data } = parseDataUrl(imageDataUrl);
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: `${BASE_PROMPT}\n${MODE_PROMPTS[mode]}` },
          {
            inline_data: {
              data,
              mime_type: mime,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: 'application/json',
    },
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Gemini devolvio un error: ${errorText}`);
  }

  const payload = await response.json();
  const text =
    payload?.candidates?.[0]?.content?.parts?.[0]?.text ||
    payload?.candidates?.[0]?.content?.parts?.[0]?.textContent;

  if (!text) {
    throw new Error('Gemini no devolvio ningun resultado legible.');
  }

  try {
    const parsed = JSON.parse(text);
    return {
      artist: parsed.artist?.trim() || undefined,
      title: parsed.title?.trim() || undefined,
      catalogNumber: parsed.catalogNumber?.trim() || undefined,
      format: parsed.format?.trim() || undefined,
      confidence:
        typeof parsed.confidence === 'number'
          ? Math.min(Math.max(parsed.confidence, 0), 1)
          : undefined,
      notes: parsed.notes?.trim() || undefined,
    };
  } catch (error) {
    console.error('Error al parsear la respuesta de Gemini:', text);
    throw new Error('Gemini devolvio un JSON con formato inesperado.');
  }
};
