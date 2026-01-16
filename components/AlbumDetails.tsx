import React, { useState, useEffect } from 'react';
import { Album } from '../types';
import { ArrowLeft, Save, Trash2, Clock, Disc, Wand2, Loader2, MinusCircle, ChevronDown, Plus } from 'lucide-react';
import { Button } from './Button';
import { lookupAlbumDetails } from '../services/discogsService';

interface AlbumDetailsProps {
  album?: Album;
  initialData?: Partial<Album>;
  scannedImage?: string;
  onSave: (album: Album) => void;
  onDelete?: (id: string) => void;
  onBack: () => void;
}

export const AlbumDetails: React.FC<AlbumDetailsProps> = ({
  album,
  initialData,
  scannedImage,
  onSave,
  onDelete,
  onBack
}) => {
  const [expandedTracks, setExpandedTracks] = useState<Record<number, boolean>>({});
  const [formData, setFormData] = useState<Partial<Album>>({
    title: '',
    artist: '',
    catalogNumber: '',
    year: '',
    label: '',
    format: 'Vinyl',
    seriesName: '',
    seriesCatno: '',
    seriesId: '',
    genres: [],
    styles: [],
    tracks: [],
    coverUrl: '',
    discogsReleaseId: undefined,
  });

  const [isLookingUp, setIsLookingUp] = useState(false);

  const removeTrackAt = (index: number) => {
    if (!formData.tracks) return;
    setFormData({
      ...formData,
      tracks: formData.tracks.filter((_, idx) => idx !== index),
    });
  };

  useEffect(() => {
    if (album) {
      setFormData(album);
      return;
    }

    const base: Partial<Album> = {
      id: crypto.randomUUID(),
      title: '',
      artist: '',
      catalogNumber: '',
      year: '',
      label: '',
      format: 'Vinyl',
      tracks: [],
      coverUrl: scannedImage || '',
      addedAt: Date.now(),
    };

    if (initialData) {
      setFormData({
        ...base,
        ...initialData,
        coverUrl: initialData.coverUrl || base.coverUrl,
        genres: initialData.genres || [],
        styles: initialData.styles || [],
        seriesName: initialData.seriesName || '',
        seriesCatno: initialData.seriesCatno || '',
        seriesId: initialData.seriesId || '',
        discogsReleaseId: initialData.discogsReleaseId || undefined,
      });
    } else {
      setFormData(base);
    }
  }, [album, initialData, scannedImage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.title && formData.artist) {
      onSave(formData as Album);
    }
  };

  const handleAutofill = async () => {
    if (!formData.catalogNumber && !formData.artist && !formData.title) return;

    setIsLookingUp(true);
    try {
      const result = await lookupAlbumDetails({
        artist: formData.artist,
        title: formData.title,
        catalogNumber: formData.catalogNumber
      });

      // Merge results
      setFormData(prev => ({
        ...prev,
        artist: result.artist || prev.artist,
        title: result.title || prev.title,
        catalogNumber: result.catalogNumber || prev.catalogNumber, 
        year: result.year || prev.year,
        label: result.label || prev.label,
        tracks: result.suggestedTracks || prev.tracks,
        format: (result.format as any) || prev.format,
        coverUrl: result.coverUrl || prev.coverUrl,
        genres: result.genres || prev.genres,
        styles: result.styles || prev.styles,
        seriesName: result.seriesName || prev.seriesName,
        seriesCatno: result.seriesCatno || prev.seriesCatno,
        seriesId: result.seriesId || prev.seriesId,
        discogsReleaseId: result.discogsReleaseId || prev.discogsReleaseId,
      }));
    } catch (error: any) {
      alert(error.message || "No se encontraron datos en Discogs.");
    } finally {
      setIsLookingUp(false);
    }
  };

  const getPageTitle = () => (album ? 'Editar disco' : 'Agregar disco');

  return (
    <div className="bg-slate-950 min-h-screen flex flex-col">
      {/* Navbar Overlay / Header */}
      <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-4 h-16 flex items-center justify-between">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft size={24} />
        </button>
        <span className="font-semibold text-slate-100">{getPageTitle()}</span>
        <div className="w-10" /> {/* Spacer for centering */}
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-3xl mx-auto p-4 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Top Section: Cover & Key Info */}
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-shrink-0 w-full md:w-64 aspect-square bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl relative group">
              {formData.coverUrl ? (
                <img src={formData.coverUrl} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                  <Disc size={48} className="mb-2" />
                  <span className="text-sm">Sin portada</span>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-xs font-medium text-indigo-400 uppercase tracking-wider mb-1">Artista</label>
                <input
                  type="text"
                  required
                  value={formData.artist}
                  onChange={e => setFormData({ ...formData, artist: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-lg font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Nombre del artista"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-indigo-400 uppercase tracking-wider mb-1">Titulo del disco</label>
                <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-lg font-medium text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="Titulo"
                    />
                    <Button 
                        type="button" 
                        variant="secondary" 
                        size="md"
                        onClick={handleAutofill}
                        disabled={isLookingUp || (!formData.catalogNumber && !formData.artist && !formData.title)}
                        title="Autocompletar con Discogs"
                        className="flex-shrink-0 px-3"
                    >
                        {isLookingUp ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
                    </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Catalogo #</label>
                    <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.catalogNumber}
                          onChange={e => setFormData({ ...formData, catalogNumber: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                          placeholder="ej. SHVL 822"
                        />
                        <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm"
                            onClick={handleAutofill}
                            disabled={isLookingUp || (!formData.catalogNumber && !formData.artist && !formData.title)}
                            title="Autocompletar con Discogs"
                        >
                            {isLookingUp ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        </Button>
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Formato</label>
                    <select
                      value={formData.format}
                      onChange={e => setFormData({ ...formData, format: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                    >
                        <option value="Vinyl">Vinilo</option>
                        <option value="CD">CD</option>
                        <option value="Cassette">Casete</option>
                        <option value="Digital">Digital</option>
                    </select>
                 </div>
              </div>
              
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Año</label>
                    <input
                      type="text"
                      value={formData.year}
                      onChange={e => setFormData({ ...formData, year: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="ej. 1973"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Sello</label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={e => setFormData({ ...formData, label: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="ej. Harvest"
                    />
                </div>
             </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Coleccion</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.seriesName}
                      onChange={e => setFormData({ ...formData, seriesName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="ej. Enciclopedia Salvat..."
                    />
                    <input
                      type="text"
                      value={formData.seriesCatno}
                      onChange={e => setFormData({ ...formData, seriesCatno: e.target.value })}
                      className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="#"
                      title="Numero dentro de la serie"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Release ID</label>
                    <input
                      type="text"
                      value={formData.discogsReleaseId ?? ''}
                      onChange={e => setFormData({ ...formData, discogsReleaseId: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="ej. 123456"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Series ID</label>
                    <input
                      type="text"
                      value={formData.seriesId}
                      onChange={e => setFormData({ ...formData, seriesId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="ID de Discogs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Géneros</label>
                  <input
                    type="text"
                    value={(formData.genres || []).join(', ')}
                    onChange={e => setFormData({ ...formData, genres: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Jazz, Classical"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Estilos</label>
                  <input
                    type="text"
                    value={(formData.styles || []).join(', ')}
                    onChange={e => setFormData({ ...formData, styles: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Smooth Jazz, Romantic"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tracklist */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-lg font-semibold text-white">Lista de canciones</h3>
                <span className="text-xs text-slate-500">{formData.tracks?.length || 0} pistas</span>
            </div>
            
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {formData.tracks?.map((track, idx) => (
                  <div key={idx} className="p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors group space-y-3">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => removeTrackAt(idx)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                        title="Eliminar pista"
                      >
                        <MinusCircle size={16} />
                      </button>
                      <span className="text-xs font-mono text-slate-500">{track.position || idx + 1}</span>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={track.title}
                          onChange={(e) => {
                            const newTracks = [...(formData.tracks || [])];
                            newTracks[idx].title = e.target.value;
                            setFormData({ ...formData, tracks: newTracks });
                          }}
                          className="bg-transparent w-full text-slate-200 text-sm focus:outline-none border-b border-transparent focus:border-indigo-500 pb-0.5"
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={12} />
                        <input
                          type="text"
                          value={track.duration}
                          onChange={(e) => {
                            const newTracks = [...(formData.tracks || [])];
                            newTracks[idx].duration = e.target.value;
                            setFormData({ ...formData, tracks: newTracks });
                          }}
                          className="bg-transparent w-5 min-w-[2rem] text-right focus:outline-none border-b border-transparent focus:border-indigo-500 pb-0.5"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpandedTracks(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className="p-1 text-slate-400 hover:text-white transition-colors"
                        title="Mostrar subtracks"
                      >
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${expandedTracks[idx] ? 'rotate-180 text-indigo-400' : ''}`}
                        />
                      </button>
                    </div>

                    {expandedTracks[idx] && (
                      <div className="ml-6 space-y-2">
                        {[...(track.subTracks || [])]
                          .sort((a, b) => (a.position || '').localeCompare(b.position || '', undefined, { numeric: true, sensitivity: 'base' }))
                          .map((sub, sIdx) => (
                          <div key={sIdx} className="flex items-center gap-3 pl-4 py-1">
                            <input
                              type="text"
                              value={sub.position}
                              onChange={(e) => {
                                const newTracks = [...(formData.tracks || [])];
                                const subs = newTracks[idx].subTracks || [];
                                subs[sIdx] = { ...subs[sIdx], position: e.target.value };
                                newTracks[idx].subTracks = subs;
                                setFormData({ ...formData, tracks: newTracks });
                              }}
                              className="w-12 max-w-[48px] bg-transparent text-[11px] font-mono text-slate-500 border-b border-transparent focus:border-indigo-500 focus:outline-none text-right"
                              placeholder={`${track.position || idx + 1}.${sIdx + 1}`}
                            />
                            <input
                              type="text"
                              value={sub.title}
                              onChange={(e) => {
                                const newTracks = [...(formData.tracks || [])];
                                const subs = newTracks[idx].subTracks || [];
                                subs[sIdx] = { ...subs[sIdx], title: e.target.value };
                                newTracks[idx].subTracks = subs;
                                setFormData({ ...formData, tracks: newTracks });
                              }}
                              className="flex-1 bg-transparent text-slate-200 text-sm focus:outline-none border-b border-transparent focus:border-indigo-500 pb-0.5"
                              placeholder="Titulo subtrack"
                            />
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock size={12} />
                              <input
                                type="text"
                                value={sub.duration}
                                onChange={(e) => {
                                  const newTracks = [...(formData.tracks || [])];
                                  const subs = newTracks[idx].subTracks || [];
                                  subs[sIdx] = { ...subs[sIdx], duration: e.target.value };
                                  newTracks[idx].subTracks = subs;
                                  setFormData({ ...formData, tracks: newTracks });
                                }}
                                className="bg-transparent w-10 text-right focus:outline-none border-b border-transparent focus:border-indigo-500 pb-0.5"
                                placeholder="mm:ss"
                              />
                            </div>
                          </div>
                        ))}
                        <button
                          type="button"
                          className="text-xs text-indigo-400 hover:text-indigo-200 flex items-center gap-1"
                          onClick={() => {
                            const newTracks = [...(formData.tracks || [])];
                            if (!newTracks[idx].subTracks) newTracks[idx].subTracks = [];
                            newTracks[idx].subTracks!.push({
                              position: '',
                              title: 'Nuevo subtrack',
                              duration: '',
                            });
                            setFormData({ ...formData, tracks: newTracks });
                          }}
                        >
                          <Plus size={12} /> Agregar subtrack
                        </button>
                      </div>
                    )}
                  </div>
                 ))}
                 
                 {(!formData.tracks || formData.tracks.length === 0) && (
                     <div className="text-center py-8 text-slate-500 text-sm italic">
                         No se encontraron pistas automaticamente.
                     </div>
                 )}
             </div>
             
                 <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="w-full border-dashed border border-slate-800 py-3"
                        onClick={() => {
                            setFormData({
                                ...formData,
                                tracks: [...(formData.tracks || []), { position: '', title: 'Nueva pista', duration: '' }]
                            })
                        }}
             >
                 + Agregar pista
             </Button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-slate-800 sticky bottom-0 bg-slate-950/95 backdrop-blur-md pb-6">
             {album && onDelete && (
                 <Button type="button" variant="danger" onClick={() => onDelete(album.id)} icon={<Trash2 size={18} />}>
                     Eliminar
                 </Button>
             )}
             <Button type="submit" variant="primary" size="lg" icon={<Save size={18} />}>
                 Guardar disco
             </Button>
          </div>

          </form>
        </div>
      </div>
    </div>
  );
};
