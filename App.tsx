import React, { useState, useEffect } from 'react';
import { Library } from './components/Library';
import { Scanner } from './components/Scanner';
import { AlbumDetails } from './components/AlbumDetails';
import { Album, ViewState, ScanMode } from './types';
import { fetchRemoteAlbums, upsertRemoteAlbum, deleteRemoteAlbum } from './services/librarySyncService';
import { editorPassword } from './services/editorAccess';
import { analyzeScan } from './services/scanAnalyzer';

// Initial mock data
const MOCK_ALBUMS: Album[] = [
  {
    id: '1',
    artist: 'Pink Floyd',
    title: 'The Dark Side of the Moon',
    format: 'Vinyl',
    catalogNumber: 'SHVL 804',
    year: '1973',
    label: 'Harvest',
    coverUrl: 'https://picsum.photos/400/400?random=1',
    addedAt: Date.now(),
    tracks: [
        { position: 'A1', title: 'Speak to Me', duration: '1:30' },
        { position: 'A2', title: 'Breathe', duration: '2:43' },
    ]
  },
  {
    id: '2',
    artist: 'Daft Punk',
    title: 'Random Access Memories',
    format: 'Vinyl',
    catalogNumber: '88883716861',
    year: '2013',
    label: 'Columbia',
    coverUrl: 'https://picsum.photos/400/400?random=2',
    addedAt: Date.now() - 10000,
    tracks: []
  }
];

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.LIBRARY);
  const [albums, setAlbums] = useState<Album[]>(MOCK_ALBUMS);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | undefined>(undefined);
  const [scannedImage, setScannedImage] = useState<string | undefined>(undefined);
  const [draftAlbum, setDraftAlbum] = useState<Partial<Album> | undefined>(undefined);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [libraryViewMode, setLibraryViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditor, setIsEditor] = useState<boolean>(() => {
    const cached = localStorage.getItem('vinyl-vision-editor');
    return cached === 'granted';
  });

  // Load from local storage on mount (simulated persistence)
  useEffect(() => {
    const saved = localStorage.getItem('vinyl-vision-library');
    if (saved) {
      try {
        setAlbums(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load library", e);
      }
    }

    const loadRemote = async () => {
      try {
        const remote = await fetchRemoteAlbums();
        if (remote) {
          setAlbums(remote);
          localStorage.setItem('vinyl-vision-library', JSON.stringify(remote));
        }
      } catch (error) {
        console.error('Failed to sync from Supabase', error);
      } finally {
      }
    };

    loadRemote();
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('vinyl-vision-library', JSON.stringify(albums));
  }, [albums]);

  const ensureEditorAccess = () => {
    if (!editorPassword) return true;
    if (isEditor) return true;

    const input = prompt('Introduce la contrasena de edicion');
    if (input && input === editorPassword) {
      localStorage.setItem('vinyl-vision-editor', 'granted');
      setIsEditor(true);
      return true;
    }

    alert('Contrasena incorrecta');
    return false;
  };

  const handleManualAdd = () => {
    if (!ensureEditorAccess()) return;

    setSelectedAlbum(undefined);
    setDraftAlbum(undefined);
    setScannedImage(undefined);
    setView(ViewState.DETAILS);
  };

  const handleStartScan = () => {
    if (!ensureEditorAccess()) return;
    setSelectedAlbum(undefined);
    setDraftAlbum(undefined);
    setScannedImage(undefined);
    setView(ViewState.SCANNER);
  };

  const handleScanCapture = async ({ image, mode }: { image: string; mode: ScanMode }) => {
    if (!ensureEditorAccess()) return;
    setIsProcessingScan(true);
    try {
      const prefill = await analyzeScan(image, mode);
      setDraftAlbum(prefill);
      setScannedImage(image);
      setSelectedAlbum(undefined);
      setView(ViewState.DETAILS);
    } catch (error) {
      console.error('No se pudo analizar el escaneo', error);
      alert('No se pudo identificar el disco automaticamente. Completa los datos manualmente.');
      setDraftAlbum({
        id: crypto.randomUUID(),
        coverUrl: image,
        addedAt: Date.now(),
        format: 'Vinyl',
        tracks: [],
      });
      setScannedImage(image);
      setSelectedAlbum(undefined);
      setView(ViewState.DETAILS);
    } finally {
      setIsProcessingScan(false);
    }
  };

  const handleSaveAlbum = async (album: Album) => {
    const normalizedTitle = album.title.trim().toLowerCase();
    const normalizedArtist = album.artist.trim().toLowerCase();
    const normalizedCatalog = album.catalogNumber?.trim().toLowerCase();

    const alreadyExists = albums.some(a => {
      if (a.id === album.id) return false;
      const sameCatalog =
        normalizedCatalog &&
        a.catalogNumber &&
        a.catalogNumber.trim().toLowerCase() === normalizedCatalog;
      const sameArtistTitle =
        a.title.trim().toLowerCase() === normalizedTitle &&
        a.artist.trim().toLowerCase() === normalizedArtist;
      return Boolean(sameCatalog || sameArtistTitle);
    });

    if (alreadyExists) {
      alert('Ese disco ya esta en tu biblioteca.');
      return;
    }

    setDraftAlbum(undefined);
    setAlbums(prev => {
      const existing = prev.findIndex(a => a.id === album.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = album;
        return updated;
      } else {
        return [album, ...prev];
      }
    });

    // Reset add/edit state
    setSelectedAlbum(undefined);
    setDraftAlbum(undefined);
    setScannedImage(undefined);
    setView(ViewState.LIBRARY);

    try {
      await upsertRemoteAlbum(album);
    } catch (error) {
      console.error('Failed to sync album with Supabase', error);
    }
  };

  const handleDeleteAlbum = async (id: string) => {
      if(window.confirm("Estas seguro de que quieres eliminar este disco?")) {
        setAlbums(prev => prev.filter(a => a.id !== id));
        setView(ViewState.LIBRARY);
        try {
          await deleteRemoteAlbum(id);
        } catch (error) {
          console.error('Failed to delete album from Supabase', error);
        }
      }
  };

  const handleSelectAlbum = (album: Album) => {
    if (!ensureEditorAccess()) return;
    setSelectedAlbum(album);
    setDraftAlbum(undefined);
    setScannedImage(undefined);
    setView(ViewState.DETAILS);
  };

  const handleBackToLibrary = () => {
    setSelectedAlbum(undefined);
    setDraftAlbum(undefined);
    setScannedImage(undefined);
    setView(ViewState.LIBRARY);
  };

  const handleToggleLibraryView = () => {
    setLibraryViewMode(prev => (prev === 'grid' ? 'list' : 'grid'));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {isProcessingScan && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center text-white text-lg">
          Analizando escaneo...
        </div>
      )}
      
      {/* Main Content Area */}
      <main className="h-full">
        {view === ViewState.LIBRARY && (
         <Library
            albums={albums}
            onSelectAlbum={handleSelectAlbum}
            onEditAlbum={handleSelectAlbum}
            viewMode={libraryViewMode}
            onToggleView={handleToggleLibraryView}
            onManualClick={handleManualAdd}
            onScanClick={handleStartScan}
          />
        )}

        {view === ViewState.SCANNER && (
          <Scanner
            onClose={() => setView(ViewState.LIBRARY)}
            onCapture={handleScanCapture}
          />
        )}

        {view === ViewState.DETAILS && (
          <AlbumDetails 
            album={selectedAlbum}
            initialData={draftAlbum}
            scannedImage={scannedImage}
            onSave={handleSaveAlbum}
            onDelete={handleDeleteAlbum}
            onBack={handleBackToLibrary}
          />
        )}
      </main>

    </div>
  );
}
