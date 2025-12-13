import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, BookOpen, Layers } from 'lucide-react';
import { Button } from './Button';
import { ScanMode } from '../types';

interface ScannerProps {
  onClose: () => void;
  onCapture: (image: string) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanMode, setScanMode] = useState<ScanMode>(ScanMode.SPINE);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('No se pudo acceder a la camara. Revisa los permisos e intenta de nuevo.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || isCapturing) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      setIsCapturing(false);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    onCapture(imageData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="text-white font-semibold drop-shadow-md">
          {scanMode === ScanMode.SPINE ? 'Escanear lomo' : 'Escanear portada'}
        </div>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="text-white bg-white/20 p-2 rounded-full backdrop-blur-md hover:bg-white/30 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Video Viewport */}
      <div className="relative flex-1 bg-slate-900 overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-8">
            <div className="space-y-4">
              <p className="text-red-400">{error}</p>
              <Button onClick={startCamera}>Reintentar</Button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              onLoadedMetadata={() => videoRef.current?.play()}
            />

            {/* Overlay / Reticle */}
            {isStreaming && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full bg-black/45 flex items-center justify-center relative">
                  <div
                    className={`border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all duration-300 relative
                      ${scanMode === ScanMode.SPINE
                        ? 'w-[85%] h-24 rounded-lg'
                        : 'w-[80%] aspect-square rounded-2xl'
                      }
                    `}
                  >
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-indigo-500 -mt-0.5 -ml-0.5" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-indigo-500 -mt-0.5 -mr-0.5" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-indigo-500 -mb-0.5 -ml-0.5" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-indigo-500 -mb-0.5 -mr-0.5" />
                  </div>

                  <div className="absolute top-[65%] text-center px-4 w-full">
                    <p className="text-white/90 text-sm font-medium drop-shadow-lg bg-black/25 inline-block px-3 py-1 rounded-full backdrop-blur-sm">
                      {scanMode === ScanMode.SPINE ? 'Alinea el texto del lomo en el marco' : 'Alinea la portada dentro del marco'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      <div className="bg-slate-950 p-6 pb-safe">
        <div className="max-w-md mx-auto flex flex-col gap-6">
          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
            <button
              onClick={() => setScanMode(ScanMode.SPINE)}
              className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${
                scanMode === ScanMode.SPINE ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={16} />
              Lomo
            </button>
            <button
              onClick={() => setScanMode(ScanMode.COVER)}
              className={`flex-1 py-2 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${
                scanMode === ScanMode.COVER ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen size={16} />
              Portada
            </button>
          </div>

          <div className="flex justify-center items-center">
            <button
              onClick={handleCapture}
              disabled={!isStreaming || isCapturing || !!error}
              className={`w-20 h-20 rounded-full border-4 border-slate-800 flex items-center justify-center transition-all ${
                isCapturing ? 'bg-slate-700 scale-95 cursor-wait' : 'bg-white hover:bg-slate-200 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
              }`}
            >
              <div className={`w-16 h-16 rounded-full border-2 border-slate-300 ${isCapturing ? 'bg-indigo-500 animate-pulse' : 'bg-transparent'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
