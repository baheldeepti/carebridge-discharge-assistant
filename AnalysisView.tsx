
import React, { useState, useRef } from 'react';
import { DischargeAnalysis, MedicationVerification, FileData } from '../types';
import { LiveCompanion } from './LiveCompanion';
import { generateTTS, verifyMedicationBottle } from '../services/geminiService';
import { UI_STRINGS } from '../services/translations';

interface AnalysisViewProps {
  data: DischargeAnalysis;
  onReset: () => void;
}

const getCategoryIcon = (category: string) => {
  const c = category.toLowerCase();
  const baseClass = "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm border shrink-0";
  
  if (c.includes('rest') || c.includes('sleep')) {
    return (
      <div className={`${baseClass} bg-indigo-50 border-indigo-100 text-indigo-500`}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      </div>
    );
  }
  
  if (c.includes('diet') || c.includes('nutrition') || c.includes('fluid')) {
    return (
      <div className={`${baseClass} bg-emerald-50 border-emerald-100 text-emerald-500`}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
    );
  }
  
  if (c.includes('activity') || c.includes('walk')) {
    return (
      <div className={`${baseClass} bg-orange-50 border-orange-100 text-orange-500`}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    );
  }

  if (c.includes('wound') || c.includes('care')) {
    return (
      <div className={`${baseClass} bg-rose-50 border-rose-100 text-rose-500`}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
    );
  }
  
  if (c.includes('medication') || c.includes('pharmacy')) {
    return (
      <div className={`${baseClass} bg-blue-50 border-blue-100 text-blue-500`}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </div>
    );
  }

  if (c.includes('check') || c.includes('follow')) {
    return (
      <div className={`${baseClass} bg-purple-50 border-purple-100 text-purple-500`}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }
  
  // Default General
  return (
    <div className={`${baseClass} bg-slate-50 border-slate-100 text-slate-500`}>
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
};

export const AnalysisView: React.FC<AnalysisViewProps> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<'plain' | 'structured' | 'quiz' | 'guardian'>('plain');
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<MedicationVerification | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const { structured_extraction: s, plain_language_explanation: p, teach_back_questions: q, detected_language: lang } = data;
  const t = UI_STRINGS[lang] || UI_STRINGS['English'];

  const handleBottleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsVerifying(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const result = await verifyMedicationBottle({ base64: (reader.result as string).split(',')[1], mimeType: file.type, name: file.name }, s.medications.map(m => m.name).join(', '));
      setVerificationResult(result);
      setIsVerifying(false);
    };
    reader.readAsDataURL(file);
  };

  const handleReadAloud = async (text: string) => {
    if (isReading) { activeSourceRef.current?.stop(); setIsReading(false); return; }
    try {
      setIsReading(true);
      const base64 = await generateTTS(text, lang);
      const ctx = audioContextRef.current || new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = ctx;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const int16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, int16.length, 24000);
      buffer.getChannelData(0).set(Array.from(int16).map(v => v / 32768));
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.onended = () => setIsReading(false);
      activeSourceRef.current = src;
      src.start();
    } catch { setIsReading(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {isCompanionOpen && <LiveCompanion summary={s.patient_summary} language={lang} onClose={() => setIsCompanionOpen(false)} />}

      {/* SOS / EMERGENCY BANNER */}
      {s.care_team_contact?.phone && (
        <div className="bg-red-50 border-2 border-red-200 rounded-[2.5rem] p-6 shadow-sm flex items-center gap-5">
          <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center text-3xl shadow-lg">🚨</div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-red-900">{t.emergency_warning}</h3>
            <p className="text-red-700 font-bold">{t.emergency_desc}</p>
          </div>
          <a href={`tel:${s.care_team_contact.phone}`} className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-transform active:scale-95">{t.call_team}</a>
        </div>
      )}

      {/* HEADER ACTIONS */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 leading-none mb-2">CareBridge Plan</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Active Language: <span className="text-blue-600">{lang}</span></p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsCompanionOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl hover:bg-blue-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" /><path d="M18 8a1 1 0 00-2 0v2a6 6 0 11-12 0V8a1 1 0 00-2 0v2a8 8 0 007.5 7.93V19a1 1 0 102 0v-1.07A8 8 0 0018 10V8z" /></svg>
            {t.live_nurse}
          </button>
          <button onClick={onReset} className="bg-white border-2 border-slate-100 px-6 py-3 rounded-2xl font-bold text-slate-500 hover:bg-slate-50">{t.new_doc}</button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex bg-slate-100 p-1.5 rounded-[2rem] gap-1">
        {[
          { id: 'plain', label: t.tab_plain },
          { id: 'guardian', label: t.tab_guardian },
          { id: 'structured', label: t.tab_plan },
          { id: 'quiz', label: t.tab_quiz }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex-1 py-3 px-2 rounded-[1.5rem] font-black text-xs transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-50 overflow-hidden min-h-[600px]">
        {activeTab === 'plain' && (
          <div className="p-8 sm:p-12 space-y-12">
            <div className="flex items-center justify-between border-b border-slate-50 pb-8">
              <h3 className="text-3xl font-black text-slate-900">{t.recovery_roadmap}</h3>
              <button onClick={() => handleReadAloud(p)} className="bg-blue-50 text-blue-600 px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2">
                {isReading ? '⏹ STOP' : '🔊 LISTEN'}
              </button>
            </div>

            {/* HIGH IMPACT: VISUAL TIMELINE */}
            <div className="grid grid-cols-1 gap-6 relative">
              <div className="absolute left-6 top-4 bottom-4 w-1 bg-slate-100 rounded-full"></div>
              {s.recovery_timeline?.map((step, i) => (
                <div key={i} className="flex gap-8 items-start pl-2">
                  <div className="relative z-10 bg-white rounded-full">
                     {getCategoryIcon(step.category)}
                  </div>
                  <div className="bg-slate-50 rounded-3xl p-6 flex-1 border border-slate-100 shadow-sm hover:translate-x-1 transition-transform">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{step.time}</p>
                    <p className="text-lg font-bold text-slate-800 leading-snug">{step.activity}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="prose prose-slate prose-lg max-w-none border-t border-slate-50 pt-10">
              <p className="whitespace-pre-wrap leading-relaxed">{p}</p>
            </div>
          </div>
        )}

        {activeTab === 'guardian' && (
          <div className="p-12 text-center space-y-12">
            <div className="max-w-md mx-auto space-y-6">
              <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">💊</div>
              <h3 className="text-3xl font-black">{t.tab_guardian}</h3>
              <p className="text-slate-500 font-medium">Verify your medication by snapping a photo of the bottle. We'll cross-check it with your doctor's official orders.</p>
              <div className="relative group overflow-hidden rounded-3xl border-4 border-dashed border-slate-200 hover:border-blue-400 transition-colors">
                <input type="file" onChange={handleBottleScan} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className={`py-8 font-black text-blue-600 uppercase tracking-widest ${isVerifying ? 'animate-pulse' : ''}`}>
                  {isVerifying ? '🔬 Analyzing...' : '📷 Scan Bottle'}
                </div>
              </div>
            </div>

            {verificationResult && (
              <div className={`p-10 rounded-[2.5rem] border-2 animate-in slide-in-from-top-4 duration-500 ${verificationResult.is_match ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <div className="flex flex-col items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl shadow-lg ${verificationResult.is_match ? 'bg-emerald-500' : 'bg-red-500'}`}>
                    {verificationResult.is_match ? '✓' : '!'}
                  </div>
                  <h4 className="text-2xl font-black uppercase tracking-tight">
                    {verificationResult.is_match ? 'Verified Match' : 'Caution: Mismatch'}
                  </h4>
                  <p className="text-slate-600 font-bold">Detected: <span className="text-slate-900">{verificationResult.detected_med_name} {verificationResult.detected_dosage}</span></p>
                  {!verificationResult.is_match && <p className="bg-white p-6 rounded-2xl border border-red-200 text-red-700 font-black mt-4">⚠️ {verificationResult.mismatch_details}</p>}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'structured' && (
          <div className="p-12 space-y-16">
            <section>
              <h3 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-4">
                <span className="w-2 h-8 bg-blue-600 rounded-full"></span>
                {t.safety_alert}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {s.medications.map((m, i) => (
                  <div key={i} className="group border-2 border-slate-50 rounded-[2.5rem] p-8 hover:border-blue-200 transition-all bg-slate-50/50">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-2xl font-black text-slate-900">{m.name}</h4>
                        <p className="text-blue-600 font-black text-xs uppercase tracking-widest">{m.dose} • {m.frequency}</p>
                      </div>
                      <span className="text-2xl">💊</span>
                    </div>
                    <p className="text-slate-700 font-medium mb-6 leading-relaxed">{m.safety_alert}</p>
                    {m.sources && m.sources.length > 0 && (
                      <div className="pt-6 border-t border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Clinical Sources</p>
                        <div className="flex flex-wrap gap-2">
                          {m.sources.map((src, idx) => (
                            <a key={idx} href={src.uri} target="_blank" className="text-[10px] bg-white border border-slate-100 px-3 py-1.5 rounded-full text-blue-600 font-bold hover:bg-blue-600 hover:text-white transition-all">{src.title}</a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {s.home_care_instructions.length > 0 && (
              <section>
                <h3 className="text-2xl font-black text-slate-800 mb-8">{t.tab_plan}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {s.home_care_instructions.map((item, i) => (
                    <div key={i} className="flex gap-5 p-6 bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      {getCategoryIcon(item.category)}
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.category}</p>
                        <p className="text-slate-800 font-bold leading-snug">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'quiz' && (
          <div className="p-12 max-w-2xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h3 className="text-4xl font-black text-slate-900 leading-tight">Readiness Check</h3>
              <p className="text-slate-500 font-medium text-lg">Answer these safety questions to ensure you're fully prepared for home care.</p>
            </div>
            <div className="space-y-6">
              {q.map((question, i) => (
                <div key={i} className="group p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-white hover:shadow-xl hover:-translate-y-1 transition-all">
                  <div className="flex gap-6 items-start">
                    <span className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shrink-0 shadow-lg">0{i+1}</span>
                    <p className="text-xl font-bold text-slate-800 leading-tight">{question}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
