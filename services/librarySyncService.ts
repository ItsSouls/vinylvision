import { Album, Track, Performer, SubTrack } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

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

const serializeAlbum = (album: Album, _style: ColumnStyle) => {
  // Use the exact column names present in the current schema (mixed camel + snake).
  return {
    id: album.id,
    artist: album.artist,
    title: album.title,
    year: toDateString(album.year ?? null),
    label: album.label ?? null,
    format: album.format,
    catalogNumber: album.catalogNumber ?? null, // camel in DB
    coverUrl: album.coverUrl ?? null, // camel in DB
    addedAt: album.addedAt, // camel in DB
    series_name: album.seriesName ?? null, // snake in DB
    series_catno: album.seriesCatno ?? null,
    series_id: album.seriesId ?? null,
    genres: album.genres ?? null,
    styles: album.styles ?? null,
    discogs_release_id: album.discogsReleaseId ?? null, // snake in DB
  };
};

const formatDuration = (seconds?: number | null) => {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const parseDurationSec = (duration?: string | null): number | null => {
  if (!duration) return null;
  const trimmed = duration.trim();
  const mmss = /^(\d+):(\d{1,2})$/.exec(trimmed);
  if (mmss) {
    const mins = Number(mmss[1]);
    const secs = Number(mmss[2]);
    if (Number.isFinite(mins) && Number.isFinite(secs)) {
      return mins * 60 + secs;
    }
  }
  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) ? asNumber : null;
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

const toSubTrack = (row: any): SubTrack => {
  const durationSec = typeof row.duration_sec === 'number' ? row.duration_sec : row.durationSec;
  return {
    position: row.position ?? '',
    title: row.title ?? '',
    duration: formatDuration(durationSec),
    durationSec: typeof durationSec === 'number' ? durationSec : undefined,
    composer: Array.isArray(row.composer) ? row.composer : row.composer ? [row.composer] : undefined,
    performers: sanitizePerformers(row.performers),
  };
};

const toTrack = (row: any): Track => {
  const durationSec = typeof row.duration_sec === 'number' ? row.duration_sec : row.durationSec;

  return {
    position: row.position ?? '',
    title: row.title ?? '',
    duration: formatDuration(durationSec),
    durationSec: typeof durationSec === 'number' ? durationSec : undefined,
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

  let tracksByAlbum: Record<string, { track: Track; id: any }[]> = {};
  let rawTrackRows: any[] = [];
  try {
    const { data: trackRows, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .order('position', { ascending: true });

    if (trackError) {
      console.warn('Failed to fetch tracks', trackError);
    } else if (trackRows) {
      rawTrackRows = trackRows || [];
      tracksByAlbum = rawTrackRows.reduce((acc, row) => {
        const albumId = row.album_id ?? row.albumId;
        if (!albumId) return acc;
        if (!acc[albumId]) acc[albumId] = [];
        acc[albumId].push({ track: toTrack(row), id: row.id });
        return acc;
      }, {} as Record<string, { track: Track; id: any }[]>);
    }
  } catch (err) {
    console.warn('Track fetch threw', err);
  }

  // Fetch subtracks grouped by track_id
  let subtracksByTrack: Record<string, SubTrack[]> = {};
  try {
    const { data: subRows, error: subError } = await supabase
      .from('subtracks')
      .select('*')
      .order('position', { ascending: true });

    if (subError) {
      console.warn('Failed to fetch subtracks', subError);
    } else if (subRows) {
      subtracksByTrack = (subRows || []).reduce((acc, row) => {
        const trackId = row.track_id ?? row.trackId;
        if (!trackId) return acc;
        if (!acc[trackId]) acc[trackId] = [];
        acc[trackId].push(toSubTrack(row));
        return acc;
      }, {} as Record<string, SubTrack[]>);
    }
  } catch (err) {
    console.warn('Subtrack fetch threw', err);
  }

  return (data || []).map(record => {
    const album = deserializeAlbum(record);
    const extraTracks = tracksByAlbum[album.id] ?? [];
    if (extraTracks.length > 0) {
      const withSubs = extraTracks.map(({ track, id }) => ({
        ...track,
        subTracks: subtracksByTrack[String(id)] ?? [],
      }));
      return { ...album, tracks: withSubs };
    }
    return album;
  });
};

export const upsertRemoteAlbum = async (album: Album) => {
  if (!isSupabaseConfigured || !supabase) return;

  const payload = serializeAlbum(album, 'camel');
  const { error } = await supabase.from(TABLE).upsert(payload, {
    onConflict: 'id',
    returning: 'minimal',
  });

  if (error) {
    throw error;
  }

  // Persist tracks in separate table
  const tracks = album.tracks || [];
  const albumId = album.id;

  const toTrackRow = (track: Track, idx: number) => {
    const resolvedPosition =
      typeof track.position === 'string' && track.position.trim()
        ? track.position.trim()
        : String(idx + 1);
    const durationSec = track.durationSec ?? parseDurationSec(track.duration);
    const composer = track.composer?.filter(Boolean);
    const performers = track.performers?.filter(Boolean);

    return {
      album_id: albumId,
      position: resolvedPosition,
      title: track.title ?? '',
      duration_sec: typeof durationSec === 'number' ? durationSec : null,
      composer: composer && composer.length > 0 ? composer : [],
      performers: performers && performers.length > 0 ? performers : [],
    };
  };

  try {
    await supabase.from('tracks').delete().eq('album_id', albumId);
    if (tracks.length > 0) {
      const insertRows = tracks.map(toTrackRow);
      const { error: insertError } = await supabase.from('tracks').insert(insertRows);
      if (insertError) {
        throw insertError;
      }

      // Fetch inserted tracks to get IDs
      const { data: insertedTracks, error: fetchInsertedError } = await supabase
        .from('tracks')
        .select('id, position, title')
        .eq('album_id', albumId)
        .order('position', { ascending: true });

      if (fetchInsertedError) {
        throw fetchInsertedError;
      }

      // Insert subtracks if any
      const subtrackRows: any[] = [];
      (insertedTracks || []).forEach((row, idx) => {
        const trackDef = tracks[idx];
        if (!trackDef?.subTracks || trackDef.subTracks.length === 0) return;
        trackDef.subTracks.forEach((sub, subIdx) => {
          const durationSec = sub.durationSec ?? parseDurationSec(sub.duration);
          const composer = sub.composer?.filter(Boolean);
          const performers = sub.performers?.filter(Boolean);
          subtrackRows.push({
            track_id: row.id,
            position: sub.position?.trim() || `${row.position || ''}.${subIdx + 1}`,
            title: sub.title ?? '',
            duration_sec: typeof durationSec === 'number' ? durationSec : null,
            composer: composer && composer.length > 0 ? composer : [],
            performers: performers && performers.length > 0 ? performers : [],
          });
        });
      });

      if (subtrackRows.length > 0) {
        const { error: subInsertError } = await supabase.from('subtracks').insert(subtrackRows);
        if (subInsertError) {
          throw subInsertError;
        }
      }
    }
  } catch (trackError) {
    console.error('Failed to sync tracks with Supabase', trackError);
    throw trackError;
  }
};

export const deleteRemoteAlbum = async (id: string) => {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase.from(TABLE).delete().eq('id', id);

  if (error) {
    throw error;
  }
};
