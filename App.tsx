import React, { useState, useEffect } from 'react';
import { Library } from './components/Library';
import { Scanner } from './components/Scanner';
import { AlbumDetails } from './components/AlbumDetails';
import { Album, ViewState } from './types';
import { fetchRemoteAlbums, upsertRemoteAlbum, deleteRemoteAlbum } from './services/librarySyncService';

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

  const handleManualAdd = () => {
    setSelectedAlbum(undefined);
    setScannedImage(undefined);
    setView(ViewState.DETAILS);
  };

  const handleStartScan = () => {
    setSelectedAlbum(undefined);
    setScannedImage(undefined);
    setView(ViewState.SCANNER);
  };

  const handleScanCapture = (imageData: string) => {
    setSelectedAlbum(undefined);
    setScannedImage(imageData);
    setView(ViewState.DETAILS);
  };

  const handleSaveAlbum = async (album: Album) => {
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
    setSelectedAlbum(album);
    setScannedImage(undefined);
    setView(ViewState.DETAILS);
  };

  const handleBackToLibrary = () => {
    setSelectedAlbum(undefined);
    setScannedImage(undefined);
    setView(ViewState.LIBRARY);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* Main Content Area */}
      <main className="h-full">
        {view === ViewState.LIBRARY && (
          <Library
            albums={albums}
            onSelectAlbum={handleSelectAlbum}
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
