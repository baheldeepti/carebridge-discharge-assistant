
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';

interface LiveCompanionProps {
  summary: string;
  language: string;
  onClose: () => void;
}

export const LiveCompanion: React.FC<LiveCompanionProps> = ({ summary, language, onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('Connecting to CareBridge Assistant...');
  const [urgentTrigger, setUrgentTrigger] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);

  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const animationFrameRef = useRef<number | null>(null);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext) {
    const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    return buffer;
  }

  useEffect(() => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let isMounted = true;

    const initLive = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!isMounted) return;
        streamRef.current = stream;

        const inCtx = new AudioContext({ sampleRate: 16000 });
        const outCtx = new AudioContext({ sampleRate: 24000 });
        audioContextRef.current = outCtx;

        const sourceNode = inCtx.createMediaStreamSource(stream);
        const analyser = inCtx.createAnalyser();
        analyser.fftSize = 256;
        sourceNode.connect(analyser);

        const updateLevel = () => {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setMicLevel(average / 128);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
            inputAudioTranscription: {},
            systemInstruction: `You are CareBridge, a warm medical assistant speaking in ${language}. 
            Support the patient using Teach-Back on their plan: ${summary}. 
            If they sound scared or mention emergency symptoms, advise them to click 'CALL TEAM' immediately.`
          },
          callbacks: {
            onopen: () => {
              if (!isMounted) return;
              setStatus(`I'm CareBridge. I'm listening in ${language}.`);
              setIsActive(true);
              const scriptProcessor = inCtx.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                if (isMutedRef.current) return;
                const input = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
                sessionPromise.then(s => s.sendRealtimeInput({ 
                  media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } 
                }));
              };
              sourceNode.connect(scriptProcessor);
              scriptProcessor.connect(inCtx.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
              if (msg.serverContent?.inputTranscription) {
                const text = msg.serverContent.inputTranscription.text.toLowerCase();
                if (['pain', 'emergency', 'help', 'breathe'].some(w => text.includes(w))) setUrgentTrigger(true);
              }
              const base64 = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
              if (base64 && outCtx) {
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                const buffer = await decodeAudioData(decode(base64), outCtx);
                const source = outCtx.createBufferSource();
                source.buffer = buffer;
                source.connect(outCtx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }
            },
            onclose: onClose,
            onerror: () => setStatus('Connection issue. Let’s try that again.')
          }
        });
      } catch (err) { setStatus('Microphone access is required.'); }
    };

    initLive();
    return () => {
      isMounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      sourcesRef.current.forEach(s => s.stop());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [summary, language]);

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4">
      <div className={`bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-500 transform ${urgentTrigger ? 'ring-8 ring-red-500 scale-105' : ''}`}>
        <div className={`p-10 text-center text-white relative transition-colors duration-700 ${urgentTrigger ? 'bg-red-600' : 'bg-blue-600'}`}>
          <button onClick={onClose} className="absolute top-8 right-8 text-white/60 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div className="relative inline-block mb-6">
            {!isMuted && !urgentTrigger && (
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-75" style={{ transform: `scale(${1 + micLevel * 0.8})` }}></div>
            )}
            <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto border-4 border-white/30 relative z-10 ${urgentTrigger ? 'bg-red-500' : 'bg-white text-blue-600'}`}>
              <svg className={`w-12 h-12 ${isActive && !isMuted ? 'animate-bounce' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4z" />
                <path d="M18 8a1 1 0 00-2 0v2a6 6 0 11-12 0V8a1 1 0 00-2 0v2a8 8 0 007.5 7.93V19a1 1 0 102 0v-1.07A8 8 0 0018 10V8z" />
              </svg>
            </div>
          </div>
          <h3 className="text-3xl font-black">{urgentTrigger ? 'Emergency Support' : 'CareBridge Assistant'}</h3>
        </div>
        
        <div className="p-12 text-center space-y-10">
          <p className="text-slate-800 text-xl font-bold min-h-[60px]">{isMuted ? 'Waiting for you to speak...' : status}</p>
          <div className="flex justify-center gap-6">
            <button onClick={() => setIsMuted(!isMuted)} className={`p-6 rounded-3xl border-2 transition-all ${isMuted ? 'bg-red-50 border-red-100 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
              {isMuted ? (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" /></svg>
              ) : (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
              )}
            </button>
            <button onClick={onClose} className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
