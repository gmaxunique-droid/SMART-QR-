
import React, { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'qrcode';
import { QRDataType, QRState, ThemeMode } from './types';
import { detectDataType, formatInputForQR } from './services/detector';
import { CloudinaryRepository, UploadResult } from './services/CloudinaryRepository';
import Button from './components/Button';
import ScannerModal from './components/ScannerModal';
import { MAX_FILE_SIZE } from './constants';

// Smart QR Pro Branding Logo (Extracted from user image)
const APP_LOGO_BASE64 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2300f2fe;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%234facfe;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100' height='100' rx='20' fill='%231a1c1e'/%3E%3Cpath d='M30 30h10v10H30zM60 30h10v10H60zM30 60h10v10H30z' fill='url(%23g)'/%3E%3Ccircle cx='50' cy='50' r='18' fill='white'/%3E%3Cpath d='M45 45c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5zM50 55c-3 0-5 2-5 5s2 5 5 5 5-2 5-5-2-5-5-5z' fill='%236750A4'/%3E%3Cpath d='M50 45v10M45 50h10' stroke='%236750A4' stroke-width='2'/%3E%3C/svg%3E";

const COLOR_PRESETS = [
  { name: 'Standard', foreground: '#000000', background: '#ffffff' },
  { name: 'Lavender', foreground: '#6750A4', background: '#F3E5F5' },
  { name: 'Deep Sea', foreground: '#01579B', background: '#E1F5FE' },
  { name: 'Emerald', foreground: '#1B5E20', background: '#E8F5E9' },
  { name: 'Midnight', foreground: '#FFFFFF', background: '#1A1C1E' },
  { name: 'Sunset', foreground: '#852221', background: '#FFDAD6' },
];

const PALETTE = [
  '#000000', '#6750A4', '#01579B', '#1B5E20', '#BF360C', '#4A148C', '#880E4F', 
  '#FFFFFF', '#2E7D32', '#C62828', '#1565C0', '#FF8F00', '#37474F'
];

const BG_PALETTE = [
  '#ffffff', '#F3E5F5', '#E3F2FD', '#E8F5E9', '#FFF3E0', '#F5F5F5', '#1A1C1E'
];

type ViewState = 'generate' | 'history' | 'preview' | 'settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewState>('generate');
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('smartqr_theme_mode') as ThemeMode) || ThemeMode.SYSTEM;
  });

  const [state, setState] = useState<QRState>({
    rawInput: '',
    detectedType: QRDataType.TEXT,
    qrContent: '',
    isUploading: false,
    uploadProgress: 0,
    qrColor: '#000000',
    qrBgColor: '#ffffff'
  });

  const [useLogo, setUseLogo] = useState(true);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  
  const repository = useRef(new CloudinaryRepository());

  // Handle Theme Switching
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      if (themeMode === ThemeMode.DARK || (themeMode === ThemeMode.SYSTEM && mediaQuery.matches)) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('smartqr_theme_mode', themeMode);

    if (themeMode === ThemeMode.SYSTEM) {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [themeMode]);

  useEffect(() => {
    const type = detectDataType(state.rawInput);
    setState(prev => ({ ...prev, detectedType: type }));
  }, [state.rawInput]);

  const generateWithLogo = async (content: string) => {
    const canvas = document.createElement('canvas');
    const size = 1024;
    canvas.width = size;
    canvas.height = size;
    
    // Generate base QR
    await QRCode.toCanvas(canvas, content, {
      width: size,
      margin: 4,
      errorCorrectionLevel: 'H',
      color: { dark: state.qrColor, light: state.qrBgColor },
    });

    if (useLogo) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const logoImg = new Image();
        logoImg.src = APP_LOGO_BASE64;
        await new Promise((resolve) => { logoImg.onload = resolve; });
        
        const logoSize = size * 0.22;
        const x = (size - logoSize) / 2;
        const y = (size - logoSize) / 2;
        
        // Draw white background for logo
        ctx.fillStyle = state.qrBgColor;
        ctx.beginPath();
        ctx.roundRect(x - 10, y - 10, logoSize + 20, logoSize + 20, 30);
        ctx.fill();
        
        ctx.drawImage(logoImg, x, y, logoSize, logoSize);
      }
    }
    
    return canvas.toDataURL();
  };

  const generateQRCode = useCallback(async () => {
    const content = state.qrContent || formatInputForQR(state.detectedType, state.rawInput);
    if (!content) return;

    try {
      setError(null);
      const url = await generateWithLogo(content);
      setQrImageUrl(url);
      if (activeTab !== 'preview') {
        setHistory(prev => [content, ...prev.slice(0, 19)]);
        setActiveTab('preview');
      }
    } catch (err) {
      setError({ message: 'Low contrast or too much data for these colors.', code: 'qr/encoding_error' });
    }
  }, [state.qrContent, state.rawInput, state.detectedType, state.qrColor, state.qrBgColor, useLogo, activeTab]);

  useEffect(() => {
    if (activeTab === 'preview' && (state.rawInput || state.qrContent)) {
      generateQRCode();
    }
  }, [state.qrColor, state.qrBgColor, useLogo]);

  const handleClear = () => {
    setState(prev => ({
      ...prev,
      rawInput: '',
      qrContent: '',
      isUploading: false,
      uploadProgress: 0
    }));
    setQrImageUrl(null);
    setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) { 
      setError({ message: 'File exceeds 20MB limit', code: 'file/too_large' });
      return;
    }

    setError(null);
    setState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));

    repository.current.uploadFile(file, (result: UploadResult) => {
      if (result.status === 'loading') {
        setState(prev => ({ ...prev, uploadProgress: result.progress }));
      } else if (result.status === 'success') {
        setState(prev => ({
          ...prev,
          isUploading: false,
          detectedType: QRDataType.FILE,
          qrContent: result.downloadUrl,
          rawInput: `File: ${file.name}`
        }));
        setFeedback("Cloud Link Generated!");
        setTimeout(() => setFeedback(null), 3000);
      } else if (result.status === 'error') {
        setError({ message: result.message, code: result.code });
        setState(prev => ({ ...prev, isUploading: false }));
      }
    });
  };

  const handleDownload = () => {
    if (!qrImageUrl) return;
    const link = document.createElement('a');
    link.href = qrImageUrl;
    link.download = `smart-qr-pro-${Date.now()}.png`;
    link.click();
  };

  const handleShare = async () => {
    if (!qrImageUrl) return;
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'qr.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ 
          files: [file], 
          title: 'Smart QR Pro', 
          text: 'Generated with Smart QR Pro' 
        });
      } else {
        await navigator.share({ text: state.qrContent || state.rawInput });
      }
    } catch (e) {
      setError({ message: "Sharing unavailable on this device.", code: 'share/unavailable' });
    }
  };

  const renderGenerate = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="m3-card p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 px-3 py-1.5 rounded-full uppercase tracking-widest flex items-center gap-1">
            <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i> {state.detectedType}
          </span>
          <button onClick={() => setIsScannerOpen(true)} className="text-indigo-600 dark:text-indigo-400 font-bold text-[11px] bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full flex items-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
            <i className="fa-solid fa-qrcode"></i> SCAN
          </button>
        </div>

        <div className="relative group">
          <textarea
            className="w-full h-32 p-4 pr-12 bg-gray-50 dark:bg-black/20 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-gray-800 dark:text-gray-100 font-medium placeholder:text-gray-400 shadow-inner transition-all"
            placeholder="Paste or upload anything..."
            value={state.rawInput}
            onChange={(e) => setState(prev => ({ ...prev, rawInput: e.target.value, qrContent: '' }))}
          />
          {state.rawInput && (
            <button 
              onClick={handleClear}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-200/50 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white rounded-full transition-all active:scale-90"
              title="Clear input"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <label className="flex-1">
            <div className="w-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-xs cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all active:scale-95">
              <i className="fa-solid fa-cloud-arrow-up"></i> FILE
            </div>
            <input type="file" className="hidden" onChange={handleFileUpload} />
          </label>
          <Button 
            className="flex-1 rounded-2xl py-4 font-bold text-xs shadow-xl shadow-indigo-200/50 dark:shadow-none" 
            onClick={generateQRCode}
            disabled={state.isUploading || (!state.rawInput && !state.qrContent)}
          >
            CREATE QR
          </Button>
        </div>

        {state.isUploading && (
          <div className="pt-2">
            <div className="flex justify-between text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1 uppercase tracking-widest">
              <span>Cloud Sync</span>
              <span>{state.uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${state.uploadProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="m3-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-indigo-600 dark:bg-indigo-400 rounded-full"></div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">QR Styling</h3>
          </div>
          <label className="flex items-center gap-3 cursor-pointer group">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-indigo-600 transition-colors">Logo Overlay</span>
             <div className="relative">
                <input type="checkbox" className="sr-only peer" checked={useLogo} onChange={(e) => setUseLogo(e.target.checked)} />
                <div className="w-10 h-5 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
             </div>
          </label>
        </div>
        
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Foreground</p>
              <span className="text-[9px] font-mono text-gray-400 font-bold">{state.qrColor}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {PALETTE.map(c => (
                <button 
                  key={c}
                  onClick={() => setState(v => ({ ...v, qrColor: c }))}
                  className={`w-10 h-10 rounded-xl transition-all active:scale-75 shadow-sm border-2 ${state.qrColor === c ? 'border-indigo-600 scale-110 shadow-lg shadow-indigo-100 dark:shadow-none' : 'border-white dark:border-gray-800'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-400 via-indigo-400 to-cyan-400 relative overflow-hidden shadow-sm hover:scale-105 transition-transform">
                <input 
                  type="color" 
                  value={state.qrColor}
                  onChange={(e) => setState(v => ({ ...v, qrColor: e.target.value }))}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                />
                <i className="fa-solid fa-plus text-white text-xs absolute inset-0 flex items-center justify-center pointer-events-none"></i>
              </div>
            </div>
          </div>

          <div>
             <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Background</p>
              <span className="text-[9px] font-mono text-gray-400 font-bold">{state.qrBgColor}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {BG_PALETTE.map(c => (
                <button 
                  key={c}
                  onClick={() => setState(v => ({ ...v, qrBgColor: c }))}
                  className={`w-10 h-10 rounded-xl transition-all active:scale-75 shadow-sm border-2 ${state.qrBgColor === c ? 'border-indigo-600 scale-110 shadow-lg shadow-indigo-100 dark:shadow-none' : 'border-gray-100 dark:border-gray-800'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 relative overflow-hidden shadow-sm hover:scale-105 transition-transform">
                <input 
                  type="color" 
                  value={state.qrBgColor}
                  onChange={(e) => setState(v => ({ ...v, qrBgColor: e.target.value }))}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                />
                <i className="fa-solid fa-eye-dropper text-gray-400 text-xs absolute inset-0 flex items-center justify-center pointer-events-none"></i>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Curated Themes</p>
             <div className="grid grid-cols-2 gap-2.5">
                {COLOR_PRESETS.map(preset => (
                   <button 
                    key={preset.name}
                    onClick={() => setState(v => ({ ...v, qrColor: preset.foreground, qrBgColor: preset.background }))}
                    className={`p-3 rounded-2xl flex items-center gap-3 transition-all text-left group ${state.qrColor === preset.foreground && state.qrBgColor === preset.background ? 'bg-indigo-600 shadow-lg' : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10'}`}
                   >
                      <div className="flex -space-x-2">
                        <div className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" style={{ backgroundColor: preset.foreground }}></div>
                        <div className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-700 shadow-sm" style={{ backgroundColor: preset.background }}></div>
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-tight transition-colors ${state.qrColor === preset.foreground && state.qrBgColor === preset.background ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>{preset.name}</span>
                   </button>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreview = () => (
    <div className="animate-in zoom-in-95 duration-300 space-y-6">
       <div className="m3-card overflow-hidden shadow-2xl border border-white dark:border-gray-800">
          <div className="p-10 flex flex-col items-center relative transition-colors duration-500" style={{ backgroundColor: state.qrBgColor }}>
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/5 backdrop-blur-md px-3 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: state.qrColor }}></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-black/40">Verified Design</span>
            </div>
            <div className="p-4 bg-white rounded-3xl shadow-xl hover:scale-105 transition-transform duration-500">
              <img src={qrImageUrl!} className="w-64 h-64 md:w-80 md:h-80 object-contain rounded-xl" alt="QR" />
            </div>
            <div className="mt-8 text-center px-4 max-w-[90%]">
              <p className="text-[10px] font-black text-black/40 uppercase tracking-widest mb-1">Payload Detected</p>
              <p className="text-xs font-mono font-bold text-black/60 break-all line-clamp-2">{state.qrContent || state.rawInput}</p>
            </div>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 flex gap-3 border-t border-gray-100 dark:border-gray-700">
            <Button variant="secondary" fullWidth onClick={() => setActiveTab('generate')} className="rounded-2xl font-bold text-xs">BACK</Button>
            <Button variant="primary" fullWidth onClick={handleDownload} icon="fa-solid fa-download" className="rounded-2xl font-bold text-xs">SAVE PNG</Button>
          </div>
       </div>
       <div className="m3-card p-6 bg-indigo-600 text-white flex flex-col items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Quick Customization</p>
          <div className="flex gap-4">
             <div className="flex flex-col items-center gap-2">
                <input 
                  type="color" 
                  value={state.qrColor}
                  onChange={(e) => setState(v => ({ ...v, qrColor: e.target.value }))}
                  className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-none"
                />
                <span className="text-[8px] font-black uppercase">FG</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <input 
                  type="color" 
                  value={state.qrBgColor}
                  onChange={(e) => setState(v => ({ ...v, qrBgColor: e.target.value }))}
                  className="w-10 h-10 rounded-full cursor-pointer bg-transparent border-none"
                />
                <span className="text-[8px] font-black uppercase">BG</span>
             </div>
          </div>
       </div>
       <Button variant="outline" fullWidth onClick={handleShare} icon="fa-solid fa-share-nodes" className="rounded-2xl py-4 font-bold text-xs border-indigo-200">SHARE CODE</Button>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tighter">Archive</h2>
        <button onClick={() => setHistory([])} className="text-[10px] font-black text-red-500 uppercase tracking-widest">Clear All</button>
      </div>
      {history.length === 0 ? (
        <div className="py-24 text-center text-gray-300 dark:text-gray-600">
          <i className="fa-solid fa-box-open text-4xl mb-4 opacity-20"></i>
          <p className="font-bold uppercase tracking-widest text-[10px]">Your archive is empty</p>
        </div>
      ) : (
        history.map((item, i) => (
          <div key={i} className="m3-card p-4 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all cursor-pointer group" onClick={() => {
            setState(v => ({ ...v, rawInput: item, qrContent: item }));
            generateQRCode();
          }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center group-hover:bg-white dark:group-hover:bg-gray-800 transition-colors">
                <i className="fa-solid fa-history"></i>
              </div>
              <div className="max-w-[200px]">
                <p className="font-bold text-gray-800 dark:text-gray-100 text-sm truncate">{item}</p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest">Tap to regenerate</p>
              </div>
            </div>
            <i className="fa-solid fa-chevron-right text-gray-300 dark:text-gray-700 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"></i>
          </div>
        ))
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tighter mb-4 px-2">Settings</h2>
        
        <div className="m3-card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center">
              <i className="fa-solid fa-palette text-lg"></i>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-tight">Appearance</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Customize your application theme</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { id: ThemeMode.LIGHT, label: 'Light Theme', icon: 'fa-sun' },
              { id: ThemeMode.DARK, label: 'Dark Theme', icon: 'fa-moon' },
              { id: ThemeMode.SYSTEM, label: 'System Default', icon: 'fa-desktop' }
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setThemeMode(option.id as ThemeMode)}
                className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all group ${themeMode === option.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-4">
                  <i className={`fa-solid ${option.icon} text-lg ${themeMode === option.id ? 'text-white' : 'text-gray-400 group-hover:text-indigo-500'}`}></i>
                  <span className="text-sm font-bold uppercase tracking-tight">{option.label}</span>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${themeMode === option.id ? 'border-white bg-white/20' : 'border-gray-300 dark:border-gray-600'}`}>
                  {themeMode === option.id && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 text-center space-y-4">
        <p className="text-[10px] text-gray-400 dark:text-gray-600 font-black uppercase tracking-[0.2em]">Smart QR Pro • Version 2.0</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 font-medium leading-relaxed px-4">
          Intelligent QR processing with Cloudinary CDN integration. Designed for maximum accessibility and performance.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fdfbff] dark:bg-[#1a1c1e] flex flex-col">
      <header className="px-6 py-6 flex items-center justify-between bg-white/50 dark:bg-black/20 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="bg-[#1a1c1e] w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer overflow-hidden border border-white/10" onClick={() => setActiveTab('generate')}>
             <img src={APP_LOGO_BASE64} alt="Pro Logo" className="w-full h-full scale-110" />
          </div>
          <div>
            <h1 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-none mb-1">Smart QR</h1>
            <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">PRO GENERATOR</p>
          </div>
        </div>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${activeTab === 'settings' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'}`}
        >
          <i className="fa-solid fa-gear text-xl"></i>
        </button>
      </header>

      <main className="flex-grow p-4 max-w-lg mx-auto w-full pb-36">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 p-5 rounded-3xl text-[11px] flex gap-4 animate-in slide-in-from-top-4">
            <i className="fa-solid fa-circle-exclamation text-lg"></i>
            <div>
              <p className="font-black uppercase tracking-widest mb-0.5">Alert</p>
              <p className="font-bold opacity-80">{error.message}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto opacity-40 hover:opacity-100 transition-opacity">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}
        
        {feedback && (
          <div className="mb-6 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400 p-5 rounded-3xl text-[11px] flex items-center gap-4 animate-in fade-in">
            <i className="fa-solid fa-check-circle text-lg"></i>
            <p className="font-bold">{feedback}</p>
          </div>
        )}

        {activeTab === 'generate' && renderGenerate()}
        {activeTab === 'preview' && renderPreview()}
        {activeTab === 'history' && renderHistory()}
        {activeTab === 'settings' && renderSettings()}
      </main>

      <nav className="fixed bottom-6 left-6 right-6 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-gray-100 dark:border-gray-800 rounded-[2.5rem] px-4 py-4 flex justify-between items-center z-50 shadow-2xl shadow-black/5">
        <button onClick={() => setActiveTab('generate')} className={`flex-1 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'generate' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600'}`}>
          <i className="fa-solid fa-circle-plus text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">Create</span>
        </button>
        <button onClick={() => setIsScannerOpen(true)} className="relative flex flex-col items-center gap-1 group">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl -mt-14 border-4 border-[#fdfbff] dark:border-[#1a1c1e] group-hover:scale-110 transition-transform">
            <i className="fa-solid fa-camera text-2xl"></i>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest mt-1 text-gray-900 dark:text-gray-100">Scan</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex-1 flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 hover:text-gray-600'}`}>
          <i className="fa-solid fa-clock-rotate-left text-xl"></i>
          <span className="text-[9px] font-black uppercase tracking-widest">History</span>
        </button>
      </nav>

      <ScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScanSuccess={(text) => {
        setState(v => ({ ...v, rawInput: text, qrContent: '' }));
        setIsScannerOpen(false);
        setActiveTab('generate');
      }} />
    </div>
  );
};

export default App;
