
import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { QRDataType, QRState, ThemeMode } from './types';
import { detectDataType, formatInputForQR } from './services/detector';
import { CloudinaryRepository, UploadResult } from './services/CloudinaryRepository';
import Button from './components/Button';
import ScannerModal from './components/ScannerModal';
import { MAX_FILE_SIZE } from './constants';

const APP_LOGO_BASE64 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2300f2fe;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%234facfe;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' rx='20' fill='%231a1c1e'/%3E%3Cpath d='M30 30h10v10H30zM60 30h10v10H60zM30 60h10v10H30z' fill='url(%23g)'/%3E%3Ccircle cx='50' cy='50' r='18' fill='white'/%3E%3Cpath d='M45 45c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5zM50 55c-3 0-5 2-5 5s2 5 5 5 5-2 5-5-2-5-5-5z' fill='%236750A4'/%3E%3Cpath d='M50 45v10M45 50h10' stroke='%236750A4' stroke-width='2'/%3E%3C/svg%3E";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'settings'>('generate');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => (localStorage.getItem('smartqr_theme_mode') as ThemeMode) || ThemeMode.SYSTEM);
  const [state, setState] = useState<QRState>({
    rawInput: '',
    detectedType: QRDataType.TEXT,
    qrContent: '',
    isUploading: false,
    uploadProgress: 0,
    qrColor: '#000000',
    qrBgColor: '#ffffff'
  });
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    if (themeMode === ThemeMode.DARK || (themeMode === ThemeMode.SYSTEM && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [themeMode]);

  useEffect(() => {
    setState(prev => ({ ...prev, detectedType: detectDataType(state.rawInput) }));
  }, [state.rawInput]);

  const generateQRCode = useCallback(async () => {
    const content = formatInputForQR(state.detectedType, state.rawInput);
    if (!content) return;
    try {
      const url = await QRCode.toDataURL(content, {
        width: 1024,
        margin: 4,
        color: { dark: state.qrColor, light: state.qrBgColor },
      });
      setQrImageUrl(url);
    } catch (err) { console.error(err); }
  }, [state.rawInput, state.detectedType]);

  return (
    <div className="min-h-screen bg-[#fdfbff] dark:bg-[#1a1c1e] flex flex-col font-sans transition-colors duration-300">
      <header className="px-6 py-6 flex items-center justify-between bg-white/50 dark:bg-black/20 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="bg-[#1a1c1e] w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center overflow-hidden border border-white/10">
             <img src={APP_LOGO_BASE64} alt="Pro Logo" className="w-full h-full scale-110" />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none mb-1">Smart QR</h1>
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">PRO GENERATOR</p>
          </div>
        </div>
        <button onClick={() => setActiveTab('settings')} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
          <i className="fa-solid fa-gear text-xl"></i>
        </button>
      </header>

      <main className="flex-grow p-5 max-w-lg mx-auto w-full overflow-y-auto pb-32">
        <div className="m3-card p-6 space-y-5 bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-900/30">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-indigo-900 dark:text-indigo-100">Paste or Upload Anything</h2>
            <span className="text-[10px] font-black text-indigo-600 bg-white dark:bg-indigo-800 px-3 py-1 rounded-full uppercase tracking-widest">{state.detectedType}</span>
          </div>
          
          <textarea
            className="w-full h-32 p-4 bg-white dark:bg-gray-800 rounded-3xl border-none focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-800 dark:text-gray-100 font-medium placeholder:text-gray-400 shadow-sm transition-all"
            placeholder="Enter text, URL, or data..."
            value={state.rawInput}
            onChange={(e) => setState(prev => ({ ...prev, rawInput: e.target.value }))}
          />

          <Button fullWidth onClick={generateQRCode} className="py-4 text-xs font-black tracking-widest uppercase rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
            GENERATE QR CODE
          </Button>
        </div>

        {qrImageUrl && (
          <div className="mt-8 space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <div className="m3-card p-8 flex flex-col items-center bg-white dark:bg-gray-900 shadow-2xl">
               <div className="p-4 bg-white rounded-3xl shadow-xl">
                  <img src={qrImageUrl} className="w-64 h-64 object-contain" alt="QR" />
               </div>
               <div className="mt-8 flex gap-3 w-full">
                  <Button variant="primary" fullWidth icon="fa-solid fa-share-nodes" className="rounded-2xl py-4 text-[10px] font-black tracking-widest">SHARE</Button>
                  <Button variant="outline" fullWidth icon="fa-solid fa-download" className="rounded-2xl py-4 text-[10px] font-black tracking-widest">SAVE</Button>
               </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-[2.5rem] px-4 py-4 flex justify-between items-center z-50 shadow-2xl">
        <button onClick={() => setActiveTab('generate')} className={`flex-1 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'generate' ? 'text-indigo-600' : 'text-gray-400'}`}>
          <i className="fa-solid fa-circle-plus text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Create</span>
        </button>
        <button onClick={() => setIsScannerOpen(true)} className="flex flex-col items-center gap-1 group">
          <div className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl -mt-10 border-4 border-[#fdfbff] dark:border-[#1a1c1e]">
            <i className="fa-solid fa-camera text-xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest mt-1 text-gray-900 dark:text-gray-100">Scan</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-indigo-600' : 'text-gray-400'}`}>
          <i className="fa-solid fa-clock-rotate-left text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">History</span>
        </button>
      </nav>

      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScanSuccess={(text) => {
        setState(v => ({ ...v, rawInput: text }));
        setIsScannerOpen(false);
      }} />
    </div>
  );
};

export default App;
