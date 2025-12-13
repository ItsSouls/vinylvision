import React, { useMemo, useState } from 'react';
import { Album } from '../types';
import { Search, Disc, Music, Calendar, Hash, Plus, ScanLine } from 'lucide-react';
import { Button } from './Button';

interface LibraryProps {
  albums: Album[];
  onSelectAlbum: (album: Album) => void;
  onManualClick: () => void;
  onScanClick: () => void;
}

export const Library: React.FC<LibraryProps> = ({
  albums,
  onSelectAlbum,
  onManualClick,
  onScanClick,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredAlbums = useMemo(() => {
    if (!normalizedSearch) {
      return albums;
    }

    const matches = (value?: string | null) =>
      value?.toLowerCase().includes(normalizedSearch);

    return albums.filter(album => {
      if (
        matches(album.artist) ||
        matches(album.title) ||
        matches(album.catalogNumber) ||
        matches(album.label) ||
        matches(album.format) ||
        matches(album.year)
      ) {
        return true;
      }

      if (album.tracks?.some(track => matches(track.title) || matches(track.position))) {
        return true;
      }

      return false;
    });
  }, [albums, normalizedSearch]);

  const totalTracks = albums.reduce((acc, alb) => acc + (alb.tracks?.length || 0), 0);

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tu coleccion</h1>
          <p className="text-slate-400 text-sm">
            {albums.length} {albums.length === 1 ? 'disco' : 'discos'} / {totalTracks} pistas
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full md:w-auto md:flex-row md:items-center">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Filtra por artista, disco, sello o formato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="hidden md:flex gap-2">
            <Button variant="secondary" icon={<Plus size={16} />} onClick={onManualClick} className="whitespace-nowrap">
              Manual
            </Button>
            <Button variant="primary" icon={<ScanLine size={16} />} onClick={onScanClick} className="whitespace-nowrap">
              Escanear
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile quick actions */}
      <div className="flex gap-2 md:hidden">
        <Button variant="secondary" className="flex-1" icon={<Plus size={16} />} onClick={onManualClick}>
          Manual
        </Button>
        <Button className="flex-1" icon={<ScanLine size={16} />} onClick={onScanClick}>
          Escanear
        </Button>
      </div>

      {/* Grid */}
      {filteredAlbums.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-slate-600">
            <Disc size={32} />
          </div>
          <h3 className="text-lg font-medium text-slate-300">No hay discos</h3>
          <p className="text-slate-500 max-w-sm mt-2 mb-6">
            {searchTerm ? "Prueba a cambiar tu busqueda." : "Tu biblioteca esta vacia. Empieza escaneando tu primer vinilo."}
          </p>
          {!searchTerm && (
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-center">
              <Button onClick={onManualClick} variant="secondary" icon={<Plus size={18} />}>
                Agregar manualmente
              </Button>
              <Button onClick={onScanClick} icon={<ScanLine size={18} />}>
                Escanear disco
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {filteredAlbums.map((album) => (
            <div
              key={album.id}
              onClick={() => onSelectAlbum(album)}
              className="group relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10"
            >
              <div className="aspect-square relative overflow-hidden bg-slate-800">
                {album.coverUrl ? (
                  <img src={album.coverUrl} alt={album.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-700">
                    <Music size={48} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />

                {/* Overlay details */}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                  <span className="text-xs font-mono bg-black/60 backdrop-blur px-1.5 py-0.5 rounded text-slate-300 border border-slate-700/50">
                    {album.format}
                  </span>
                </div>
              </div>

              <div className="p-3">
                <h3 className="font-semibold text-slate-100 truncate" title={album.title}>{album.title}</h3>
                <p className="text-sm text-slate-400 truncate">{album.artist}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  {album.year && (
                    <div className="flex items-center gap-1">
                      <Calendar size={10} />
                      <span>{album.year}</span>
                    </div>
                  )}
                  {album.catalogNumber && (
                    <div className="flex items-center gap-1">
                      <Hash size={10} />
                      <span className="uppercase">{album.catalogNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
