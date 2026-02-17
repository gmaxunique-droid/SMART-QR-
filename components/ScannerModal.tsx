
import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Button from './Button';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const regionId = "qr-reader-region";

  useEffect(() => {
    if (isOpen) {
      const startScanner = async () => {
        try {
          setError(null);
          const html5QrCode = new Html5Qrcode(regionId);
          scannerRef.current = html5QrCode;

          const config = { fps: 10, qrbox: { width: 250, height: 250 } };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              onScanSuccess(decodedText);
              stopScanner();
            },
            (errorMessage) => {
              // Ignore standard frame scan failures
            }
          );
        } catch (err: any) {
          console.error("Unable to start scanner", err);
          if (err?.name === "NotAllowedError" || err?.message?.includes("Permission")) {
            setError("Camera access was denied. Please enable camera permissions in your device settings to use the scanner feature.");
          } else {
            setError("Could not access the camera. Please ensure no other app is using it.");
          }
        }
      };

      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl flex flex-col border border-white/10 dark:border-white/5">
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
              <i className="fa-solid fa-camera"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Scan QR Code</h2>
          </div>
          <button 
            onClick={() => { stopScanner(); onClose(); }}
            className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors"
          >
            <i className="fa-solid fa-xmark text-xl"></i>
          </button>
        </div>

        <div className="relative bg-black aspect-square flex items-center justify-center">
          {error ? (
            <div className="p-10 text-center text-white space-y-4">
              <i className="fa-solid fa-triangle-exclamation text-4xl text-red-400"></i>
              <p className="text-sm font-medium leading-relaxed opacity-80">{error}</p>
              <Button variant="outline" className="border-white text-white hover:bg-white/10" onClick={() => { stopScanner(); onClose(); }}>Close</Button>
            </div>
          ) : (
            <>
              <div id={regionId} className="w-full h-full"></div>
              {/* Overlay frame */}
              <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40 flex items-center justify-center">
                 <div className="w-64 h-64 border-2 border-indigo-500 rounded-2xl relative shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]">
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                    {/* Scan line animation */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400/50 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_2s_linear_infinite]"></div>
                 </div>
              </div>
            </>
          )}
        </div>

        <div className="p-8 text-center bg-gray-50/50 dark:bg-black/20">
          <div className="mb-4 flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-2xl text-left border border-indigo-100 dark:border-indigo-900/30">
            <i className="fa-solid fa-circle-info text-indigo-500 mt-1"></i>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-bold leading-tight">
              WHY CAMERA? We use the camera strictly to read QR codes. No photos are saved or uploaded.
            </p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
            Position the QR code within the frame to automatically scan its content.
          </p>
          <div className="mt-6">
            <Button 
                variant="secondary" 
                fullWidth 
                className="rounded-2xl py-4"
                onClick={() => { stopScanner(); onClose(); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        #qr-reader-region video {
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
        }
      `}</style>
    </div>
  );
};

export default ScannerModal;
