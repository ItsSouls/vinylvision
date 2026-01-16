import { ScanResult, Track, Performer, SubTrack } from "../types";

const DISCOGS_TOKEN = import.meta.env.VITE_DISCOGS_TOKEN;
const BASE_URL = "https://api.discogs.com";

interface DiscogsQuery {
  artist?: string;
  title?: string;
  catalogNumber?: string;
}

export const lookupAlbumDetails = async (query: DiscogsQuery): Promise<ScanResult> => {
  if (!DISCOGS_TOKEN) {
    throw new Error("Falta la clave de la API de Discogs. Configura process.env.DISCOGS_TOKEN.");
  }

  // 1. Construct Search Query
  const params = new URLSearchParams({
    type: 'release',
    token: DISCOGS_TOKEN,
  });

  // Discogs search logic: be specific if possible
  if (query.catalogNumber) {
    params.append('catno', query.catalogNumber);
  }
  if (query.artist) {
    params.append('artist', query.artist);
  }
  if (query.title) {
    params.append('release_title', query.title);
  }

  // If we don't have enough specific data, fallback to a general query
  if (!query.catalogNumber && !query.artist && !query.title) {
      throw new Error("Faltan datos para buscar en Discogs");
  }

  try {
    // 2. Perform Search
    const searchResponse = await fetch(`${BASE_URL}/database/search?${params.toString()}`, {
        headers: { 'User-Agent': 'VinylVisionApp/1.0' }
    });

    if (!searchResponse.ok) {
        throw new Error(`La busqueda en Discogs fallo: ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    const results = searchData.results;

    if (!results || results.length === 0) {
      throw new Error("No se encontraron discos en Discogs con estos datos.");
    }

    // Take the first/best result
    // Ideally we might show a picker, but for autofill we pick the most likely one
    const bestMatch = results[0];
    const coverUrl = bestMatch.cover_image || bestMatch.thumb || '';
    const releaseUrl = bestMatch.resource_url;

    // 3. Fetch Full Release Details (to get tracklist)
    const releaseResponse = await fetch(`${releaseUrl}?token=${DISCOGS_TOKEN}`, {
        headers: { 'User-Agent': 'VinylVisionApp/1.0' }
    });

    if (!releaseResponse.ok) {
        throw new Error("No se pudieron obtener los detalles del lanzamiento en Discogs");
    }

    const releaseData = await releaseResponse.json();

    // 4. Map to ScanResult
    const mapPerformers = (extra: any[]): Performer[] | undefined => {
      if (!Array.isArray(extra)) return undefined;
      const mapped = extra
        .map(e => ({
          name: e?.name?.replace(/\s\(\d+\)$/, '') || '',
          role: e?.role || undefined,
        }))
        .filter(p => p.name)
        // Omitir roles de composición; ya vienen en composer
        .filter(p => !(p.role || '').toLowerCase().includes('composed by'));
      return mapped.length ? mapped : undefined;
    };

    const mapSubTracks = (subs: any[] | undefined): SubTrack[] | undefined => {
      if (!Array.isArray(subs)) return undefined;
      const mapped = subs.map(sub => ({
        position: sub?.position || '',
        title: sub?.title || '',
        duration: sub?.duration || '',
        performers: mapPerformers(sub?.extraartists),
      }));
      return mapped.length ? mapped : undefined;
    };

    const tracks: Track[] = (releaseData.tracklist || []).map((t: any) => ({
      position: t.position || '',
      title: t.title || '',
      duration: t.duration || '',
      performers: mapPerformers(t.extraartists),
      subTracks: mapSubTracks(t.sub_tracks),
    }));

    // Extract format safely
    let format = 'Vinyl';
    if (releaseData.formats && releaseData.formats.length > 0) {
        const fmtName = releaseData.formats[0].name;
        if (fmtName === 'CD') format = 'CD';
        else if (fmtName === 'Cassette') format = 'Cassette';
        else if (fmtName === 'File' || fmtName === 'Digital') format = 'Digital';
    }

    // Extract Label
    const label = (releaseData.labels && releaseData.labels.length > 0) ? releaseData.labels[0].name : '';

    // Extract Artists clean name (remove (2) etc)
    const artistName = (releaseData.artists && releaseData.artists.length > 0) 
        ? releaseData.artists[0].name.replace(/\s\(\d+\)$/, '') 
        : query.artist || '';

    return {
      artist: artistName,
      title: releaseData.title || query.title || '',
      catalogNumber: (releaseData.labels && releaseData.labels.length > 0) ? releaseData.labels[0].catno : query.catalogNumber,
      year: releaseData.year ? releaseData.year.toString() : releaseData.released?.substring(0, 4) || '',
      label: label,
      format: format,
      suggestedTracks: tracks,
      coverUrl: coverUrl
    };

  } catch (error) {
    console.error("Error buscando en Discogs:", error);
    throw error;
  }
};
