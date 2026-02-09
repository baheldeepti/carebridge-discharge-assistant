
import React, { useState, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import { analyzeDischargeDocument } from './services/geminiService';
import { DischargeAnalysis, FileData } from './types';
import { AnalysisView } from './components/AnalysisView';
import { UI_STRINGS } from './services/translations';
import { SAMPLE_DISCHARGE_TEXT } from './services/sampleData';

const LANGUAGES = [
  { id: 'English', label: 'English', flag: '🇺🇸' },
  { id: 'Spanish', label: 'Español', flag: '🇪🇸' },
  { id: 'Hindi', label: 'हिन्दी', flag: '🇮🇳' },
  { id: 'Chinese', label: '中文', flag: '🇨🇳' }
];

const STORAGE_KEY = 'carebridge_preferred_language';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DischargeAnalysis | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [lastUploadedFile, setLastUploadedFile] = useState<FileData | null>(null);
  
  const [preferredLanguage, setPreferredLanguage] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'English';
  });

  const t = UI_STRINGS[preferredLanguage] || UI_STRINGS['English'];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, preferredLanguage);
    if (lastUploadedFile && result && result.detected_language !== preferredLanguage) {
      processFileData(lastUploadedFile);
    }
  }, [preferredLanguage]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraOpen(true);
    } catch (err) {
      setError('Camera access failed.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      stopCamera();
      processFileData({ base64, mimeType: 'image/jpeg', name: `care-${Date.now()}.jpg` });
    }
  };

  const processFileData = async (fileData: FileData) => {
    setLastUploadedFile(fileData);
    setLoading(true);
    setError(null);
    setProgressMsg(t.processing);
    try {
      const analysis = await analyzeDischargeDocument(fileData, preferredLanguage);
      setResult(analysis);
    } catch (err) {
      console.error("Analysis Error:", err);
      setError('Document analysis failed. Please try a clearer scan or a different file.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      
      // Determine mimeType fallback if missing (common with MD/TXT files on some OS)
      let mimeType = file.type;
      if (!mimeType || mimeType === '') {
        if (file.name.endsWith('.md')) mimeType = 'text/markdown';
        else if (file.name.endsWith('.txt')) mimeType = 'text/plain';
        else if (file.name.endsWith('.json')) mimeType = 'application/json';
        else mimeType = 'application/octet-stream';
      }

      processFileData({ base64, mimeType, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const loadSampleData = () => {
    // Correctly encode UTF-8 characters (like °) to base64
    const text = SAMPLE_DISCHARGE_TEXT;
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    let binary = '';
    for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
    const base64 = btoa(binary);

    processFileData({ base64, mimeType: 'text/plain', name: 'demo_discharge.txt' });
  };

  const handleReset = () => {
    setResult(null);
    setLastUploadedFile(null);
    setError(null);
    setProgressMsg('');
    setIsCameraOpen(false);
  };

  return (
    <Layout>
      {!result && !loading && !isCameraOpen && (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-700">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-slate-900 leading-tight">{t.welcome_title}</h2>
            <p className="text-xl text-slate-500 font-medium">{t.welcome_desc}</p>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-100 space-y-10">
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center mb-6">{t.step1}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setPreferredLanguage(lang.id)}
                    className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all ${
                      preferredLanguage === lang.id 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 scale-105 shadow-md' 
                        : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-3xl mb-1">{lang.flag}</span>
                    <span className="text-[10px] font-black uppercase">{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">{t.step2}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative group border-2 border-dashed border-slate-200 rounded-3xl p-8 text-center bg-slate-50 hover:bg-blue-50 cursor-pointer">
                  <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <span className="font-bold text-slate-700">{t.upload_btn}</span>
                  </div>
                </div>
                <button onClick={startCamera} className="py-8 bg-slate-900 text-white rounded-3xl font-black flex flex-col items-center gap-3 hover:bg-blue-600 transition-all shadow-xl">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /></svg>
                  </div>
                  <span>{t.camera_btn}</span>
                </button>
              </div>
              
              <div className="text-center pt-2">
                 <button onClick={loadSampleData} className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  No document? Try Demo Discharge Summary
                 </button>
              </div>
            </div>
          </div>
          {error && <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-center font-bold">⚠️ {error}</div>}
        </div>
      )}

      {isCameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex-1 flex items-center justify-center"><video ref={videoRef} autoPlay playsInline className="w-full max-h-full" /></div>
          <div className="p-10 bg-black/80 flex items-center justify-center gap-10">
            <button onClick={stopCamera} className="text-white"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-slate-400 shadow-2xl active:scale-95"></button>
            <div className="w-8"></div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {loading && (
        <div className="max-w-2xl mx-auto py-20 text-center space-y-6">
          <div className="w-24 h-24 border-8 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h3 className="text-2xl font-black text-slate-800">{progressMsg}</h3>
        </div>
      )}

      {result && !loading && (
        <div className="space-y-6">
          <div className="flex justify-center mb-6">
            <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 flex gap-1">
              {LANGUAGES.map(l => (
                <button key={l.id} onClick={() => setPreferredLanguage(l.id)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${preferredLanguage === l.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
          </div>
          <AnalysisView data={result} onReset={handleReset} />
        </div>
      )}
    </Layout>
  );
};

export default App;
