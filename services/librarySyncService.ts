import { Album, Track, Performer } from '../types';
import { supabase, isSupabaseConfigured, configuredColumnStyle } from './supabaseClient';

const TABLE = 'albums';

const extractYear = (value: any): string | undefined => {
  if (!value) return undefined;
  const str = typeof value === 'string' ? value : String(value);
  if (/^\d{4}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str.slice(0, 4);
  return str;
};

const toDateString = (year?: string | null) => {
  if (!year) return null;
  if (/^\d{4}$/.test(year)) {
    return `${year}-01-01`;
  }
  return year;
};

const deserializeAlbum = (record: any): Album => ({
  id: record.id,
  artist: record.artist,
  title: record.title,
  year: extractYear(record.year),
  label: record.label || undefined,
  catalogNumber: record.catalog_number ?? record.catalognumber ?? record.catalogNumber ?? undefined,
  format: record.format,
  coverUrl: record.cover_url ?? record.coverurl ?? record.coverUrl ?? undefined,
  seriesName: record.series_name ?? record.seriesName ?? undefined,
  seriesCatno: record.series_catno ?? record.seriesCatno ?? undefined,
  seriesId: record.series_id ?? record.seriesId ?? undefined,
  genres: record.genres ?? undefined,
  styles: record.styles ?? undefined,
  tracks: record.tracks || [],
  addedAt: record.added_at ?? record.addedat ?? record.addedAt ?? Date.now(),
  discogsReleaseId: record.discogs_release_id ?? record.discogsReleaseId ?? undefined,
});

type ColumnStyle = 'snake' | 'camel' | 'legacy';

const serializeAlbum = (album: Album, style: ColumnStyle) => {
  const base = {
    id: album.id,
    artist: album.artist,
    title: album.title,
    year: toDateString(album.year ?? null),
    label: album.label ?? null,
    format: album.format,
    tracks: album.tracks ?? [],
    seriesName: album.seriesName ?? null,
    seriesCatno: album.seriesCatno ?? null,
    seriesId: album.seriesId ?? null,
    genres: album.genres ?? null,
    styles: album.styles ?? null,
    discogsReleaseId: album.discogsReleaseId ?? null,
  };

  if (style === 'camel') {
    return {
      ...base,
      catalogNumber: album.catalogNumber ?? null,
      coverUrl: album.coverUrl ?? null,
      addedAt: album.addedAt,
    };
  }

  if (style === 'legacy') {
    return {
      ...base,
      catalognumber: album.catalogNumber ?? null,
      coverurl: album.coverUrl ?? null,
      addedat: album.addedAt,
      seriesname: album.seriesName ?? null,
      seriescatno: album.seriesCatno ?? null,
      seriesid: album.seriesId ?? null,
      discogsreleaseid: album.discogsReleaseId ?? null,
    };
  }

  return {
    ...base,
    catalog_number: album.catalogNumber ?? null,
    cover_url: album.coverUrl ?? null,
    added_at: album.addedAt,
    series_name: album.seriesName ?? null,
    series_catno: album.seriesCatno ?? null,
    series_id: album.seriesId ?? null,
    discogs_release_id: album.discogsReleaseId ?? null,
  };
};

const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const sanitizePerformers = (value: any): Performer[] | undefined => {
  if (!value) return undefined;
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((entry: any) => ({
        name: entry?.name ?? '',
        role: entry?.role ?? entry?.roles ?? undefined,
      }))
      .filter(p => p.name);
  }

  if (typeof value === 'object') {
    return Object.values(value)
      .map((entry: any) => ({
        name: entry?.name ?? '',
        role: entry?.role ?? entry?.roles ?? undefined,
      }))
      .filter(p => p.name);
  }

  return undefined;
};

const toTrack = (row: any): Track => {
  const durationSec = typeof row.duration_sec === 'number' ? row.duration_sec : row.durationSec;
  const trackNo = row.track_no ?? row.trackNo;

  return {
    position: trackNo !== undefined && trackNo !== null ? String(trackNo) : row.position ?? '',
    title: row.title ?? '',
    duration: formatDuration(durationSec),
    durationSec: typeof durationSec === 'number' ? durationSec : undefined,
    trackNo: typeof trackNo === 'number' ? trackNo : undefined,
    composer: Array.isArray(row.composer) ? row.composer : row.composer ? [row.composer] : undefined,
    performers: sanitizePerformers(row.performers),
  };
};

export const fetchRemoteAlbums = async (): Promise<Album[] | null> => {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('addedAt', { ascending: false });

  if (error) {
    throw error;
  }

  let tracksByAlbum: Record<string, Track[]> = {};
  try {
    const { data: trackRows, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .order('track_no', { ascending: true });

    if (trackError) {
      console.warn('Failed to fetch tracks', trackError);
    } else if (trackRows) {
      tracksByAlbum = (trackRows || []).reduce((acc, row) => {
        const albumId = row.album_id ?? row.albumId;
        if (!albumId) return acc;
        if (!acc[albumId]) acc[albumId] = [];
        acc[albumId].push(toTrack(row));
        return acc;
      }, {} as Record<string, Track[]>);
    }
  } catch (err) {
    console.warn('Track fetch threw', err);
  }

  return (data || []).map(record => {
    const album = deserializeAlbum(record);
    const extraTracks = tracksByAlbum[album.id] ?? [];
    if (extraTracks.length > 0) {
      return { ...album, tracks: extraTracks };
    }
    return album;
  });
};

export const upsertRemoteAlbum = async (album: Album) => {
  if (!isSupabaseConfigured || !supabase) return;

  const tryUpsert = async (style: ColumnStyle) => {
    const payload = serializeAlbum(album, style);
    return supabase.from(TABLE).upsert(payload, {
      onConflict: 'id',
      returning: 'minimal',
    });
  };

  // Try styles sequentially until one works or we exhaust options
  const styles: ColumnStyle[] = configuredColumnStyle
    ? [configuredColumnStyle, 'snake', 'camel', 'legacy']
    : ['snake', 'camel', 'legacy'];
  let lastError: any = null;

  for (const style of styles) {
    const { error } = await tryUpsert(style);
    if (!error) return;
    lastError = error;
    if (error.code !== '42703' && error.code !== 'PGRST204') {
      throw error;
    }
  }

  if (lastError) {
    throw lastError;
  }
};

export const deleteRemoteAlbum = async (id: string) => {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase.from(TABLE).delete().eq('id', id);

  if (error) {
    throw error;
  }
};
