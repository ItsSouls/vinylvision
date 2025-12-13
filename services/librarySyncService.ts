import { Album } from '../types';
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
  tracks: record.tracks || [],
  addedAt: record.added_at ?? record.addedat ?? record.addedAt ?? Date.now(),
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
    };
  }

  return {
    ...base,
    catalog_number: album.catalogNumber ?? null,
    cover_url: album.coverUrl ?? null,
    added_at: album.addedAt,
  };
};

const isMissingColumnError = (error: any) => error?.code === '42703';

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

  return (data || []).map(deserializeAlbum);
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
  const styles: ColumnStyle[] = configuredColumnStyle ? [configuredColumnStyle] : ['snake', 'camel', 'legacy'];
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
