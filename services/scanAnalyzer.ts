import { Album, ScanMode } from '../types';
import { extractAlbumData } from './geminiService';
import { lookupAlbumDetails } from './discogsService';

const normalizeFormat = (value?: string): Album['format'] => {
  if (!value) return 'Vinyl';
  const normalized = value.toLowerCase();
  if (normalized.includes('cass')) return 'Cassette';
  if (normalized.includes('cd') || normalized.includes('compact')) return 'CD';
  if (normalized.includes('digital') || normalized.includes('file')) return 'Digital';
  return 'Vinyl';
};

export const analyzeScan = async (image: string, mode: ScanMode): Promise<Album> => {
  const extraction = await extractAlbumData(image, mode);

  let discogsResult: Awaited<ReturnType<typeof lookupAlbumDetails>> | null = null;

  if (extraction.artist || extraction.title || extraction.catalogNumber) {
    try {
      discogsResult = await lookupAlbumDetails({
        artist: extraction.artist,
        title: extraction.title,
        catalogNumber: extraction.catalogNumber,
      });
    } catch (error) {
      discogsResult = null;
    }
  }

  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    artist: discogsResult?.artist || extraction.artist || 'Artista desconocido',
    title: discogsResult?.title || extraction.title || 'Disco sin titulo',
    catalogNumber: discogsResult?.catalogNumber || extraction.catalogNumber,
    label: discogsResult?.label || undefined,
    year: discogsResult?.year || undefined,
    format: normalizeFormat(discogsResult?.format || extraction.format),
    coverUrl: discogsResult?.coverUrl || image,
    tracks: discogsResult?.suggestedTracks || [],
    addedAt: now,
  };
};
