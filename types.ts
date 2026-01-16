export interface Performer {
  name: string;
  role?: string;
}

export interface Track {
  position: string;
  title: string;
  duration: string;
  trackNo?: number;
  durationSec?: number;
  composer?: string[];
  performers?: Performer[];
}

export interface Album {
  id: string;
  artist: string;
  title: string;
  year?: string;
  label?: string;
  catalogNumber?: string;
  format: 'Vinyl' | 'CD' | 'Cassette' | 'Digital';
  coverUrl?: string; // Base64 or URL
  seriesName?: string;
  seriesCatno?: string;
  seriesId?: string;
  genres?: string[];
  styles?: string[];
  tracks: Track[];
  addedAt: number;
  discogsReleaseId?: number;
}

export interface ScanResult {
  artist: string;
  title: string;
  catalogNumber?: string;
  label?: string;
  year?: string;
  format?: string;
  confidence?: number; // 0-1
  suggestedTracks?: Track[];
  coverUrl?: string;
}

export enum ViewState {
  LIBRARY = 'LIBRARY',
  SCANNER = 'SCANNER',
  DETAILS = 'DETAILS',
}

export enum ScanMode {
  SPINE = 'SPINE',
  COVER = 'COVER',
}
