import Tesseract from 'tesseract.js';
import { Album, ScanMode } from '../types';
import { lookupAlbumDetails } from './discogsService';

const toTokens = (text: string) =>
  text
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);

const toLines = (text: string) =>
  text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

const findCatalogNumber = (tokens: string[]) => {
  const catalogRegex = /[A-Z0-9][A-Z0-9\-\.\/]{2,}/i;
  return tokens.find(token => catalogRegex.test(token) && /[A-Za-z]/.test(token) && /\d/.test(token));
};

const normalizeText = (value?: string) => (value ? value.replace(/\s+/g, ' ').trim() : '');

export const analyzeScan = async (image: string, mode: ScanMode): Promise<Partial<Album>> => {
  const { data } = await Tesseract.recognize(image, 'eng');
  const text = data.text || '';
  const tokens = toTokens(text.toUpperCase());
  const lines = toLines(text);

  const catalogNumber = findCatalogNumber(tokens)?.toUpperCase();

  let artistCandidate = lines[0] || '';
  let titleCandidate = lines[1] || '';

  if (mode === ScanMode.SPINE) {
    const parts = text.split(/[-·•–—:]/);
    if (parts.length >= 2) {
      artistCandidate = parts[0].trim();
      titleCandidate = parts[1].trim();
    }
  } else if (lines.length >= 2) {
    artistCandidate = lines[0];
    titleCandidate = lines.slice(1, 3).join(' ');
  }

  const query = {
    artist: normalizeText(artistCandidate) || undefined,
    title: mode === ScanMode.COVER ? normalizeText(titleCandidate) || undefined : undefined,
    catalogNumber: catalogNumber || undefined,
  };

  let discogs;
  if (query.artist || query.title || query.catalogNumber) {
    try {
      discogs = await lookupAlbumDetails(query);
    } catch (error) {
      discogs = null;
    }
  }

  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    artist: discogs?.artist || normalizeText(artistCandidate) || 'Artista desconocido',
    title: discogs?.title || normalizeText(titleCandidate) || 'Disco sin título',
    catalogNumber: discogs?.catalogNumber || catalogNumber,
    label: discogs?.label,
    format: (discogs?.format as Album['format']) || 'Vinyl',
    year: discogs?.year,
    tracks: discogs?.suggestedTracks || [],
    coverUrl: image,
    addedAt: now,
  };
};
