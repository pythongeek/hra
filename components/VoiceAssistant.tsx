"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PatientProfile } from "@/lib/types";
import { buildSystemPrompt } from "@/lib/prompts";

type Language = "en" | "bn";
type AssistantState = "idle" | "listening" | "thinking" | "speaking";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
  lang: Language;
  ts: string;
}

interface Props {
  activeProfile: PatientProfile | null;
  defaultLang?: "en" | "bn";
}

const LANG_CONFIG: Record<Language, {
  label: string; flag: string; nativeName: string;
  srLang: string; ttsLang: string; ttsVoiceKeywords: string[];
  placeholder: string; thinkingText: string; listeningText: string;
  speakingText: string; errorNoSpeech: string; errorNoMic: string;
  tapToSpeak: string; typeHere: string; sendBtn: string;
}> = {
  en: {
    label: "English", flag: "🇬🇧", nativeName: "English",
    srLang: "en-US", ttsLang: "en-US",
    ttsVoiceKeywords: ["english", "united states", "us english", "google us"],
    placeholder: "Type your health question or tap the mic...",
    thinkingText: "Thinking...", listeningText: "Listening...",
    speakingText: "Speaking...", tapToSpeak: "Tap to speak",
    errorNoSpeech: "No speech detected. Try again.",
    errorNoMic: "Microphone access denied. Please allow microphone access.",
    typeHere: "Type a question...", sendBtn: "Send",
  },
  bn: {
    label: "বাংলা", flag: "🇧🇩", nativeName: "বাংলা",
    srLang: "bn-BD", ttsLang: "bn-BD",
    ttsVoiceKeywords: ["bengali", "bangla", "bn-bd", "bn-in", "বাংলা"],
    placeholder: "আপনার স্বাস্থ্য প্রশ্ন টাইপ করুন বা মাইক চাপুন...",
    thinkingText: "ভাবছি...", listeningText: "শুনছি...",
    speakingText: "বলছি...", tapToSpeak: "কথা বলতে চাপুন",
    errorNoSpeech: "কোনো কথা শোনা যায়নি। আবার চেষ্টা করুন।",
    errorNoMic: "মাইক্রোফোন অ্যাক্সেস দেওয়া হয়নি।",
    typeHere: "প্রশ্ন লিখুন...", sendBtn: "পাঠান",
  },
};

// Animated waveform bars
function Waveform({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex items-end gap-0.5 h-8">
      {[0.4, 0.7, 1, 0.8, 0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.8, 0.5].map((h, i) => (
        <div
          key={i}
          className="w-1 rounded-full transition-all"
          style={{
            background: color,
            height: active ? `${h * 100}%` : "20%",
            animation: active ? `wave ${0.5 + i * 0.07}s ease-in-out infinite alternate` : "none",
            animationDelay: `${i * 0.05}s`,
            opacity: active ? 1 : 0.3,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}

// Pulsing ring for listening state
function PulseRing({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <>
      <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(239,68,68,0.3)" }} />
      <span className="absolute inset-0 rounded-full animate-pulse" style={{ background: "rgba(239,68,68,0.15)", animationDelay: "0.3s" }} />
    </>
  );
}

export default function VoiceAssistant({ activeProfile, defaultLang = "bn" }: Props) {
  const [lang, setLang] = useState<Language>(defaultLang);
  const [state, setState] = useState<AssistantState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState({ sr: false, tts: false });
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [textMode, setTextMode] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<AssistantState>("idle");
  const cfg = LANG_CONFIG[lang];

  // Keep stateRef in sync so closures always read the live value
  const setStateAndRef = (s: AssistantState) => {
    stateRef.current = s;
    setState(s);
  };

  // Check browser support and load voices
  useEffect(() => {
    const srSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    const ttsSupported = "speechSynthesis" in window;
    setSupported({ sr: srSupported, tts: ttsSupported });

    if (ttsSupported) {
      const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => { if (recognitionRef.current) recognitionRef.current.abort(); };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getBestVoice = useCallback((language: Language): SpeechSynthesisVoice | null => {
    const keywords = LANG_CONFIG[language].ttsVoiceKeywords;
    const ttsLang = LANG_CONFIG[language].ttsLang;

    // Try exact lang match first
    let voice = voices.find(v => v.lang.toLowerCase() === ttsLang.toLowerCase());
    if (voice) return voice;

    // Try lang prefix match (bn-BD, bn-IN etc)
    const prefix = ttsLang.split("-")[0].toLowerCase();
    voice = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (voice) return voice;

    // Try keyword match
    voice = voices.find(v => keywords.some(k => v.name.toLowerCase().includes(k)));
    if (voice) return voice;

    return null;
  }, [voices]);

  const speak = useCallback((text: string, language: Language) => {
    if (!supported.tts || isMuted) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANG_CONFIG[language].ttsLang;
    utterance.rate = language === "bn" ? 0.85 : 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voice = getBestVoice(language);
    if (voice) utterance.voice = voice;

    utterance.onstart = () => setStateAndRef("speaking");
    utterance.onend = () => setStateAndRef("idle");
    utterance.onerror = () => setStateAndRef("idle");

    utteranceRef.current = utterance;
    setStateAndRef("speaking");
    window.speechSynthesis.speak(utterance);
  }, [supported.tts, isMuted, getBestVoice]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setStateAndRef("idle");
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || state === "thinking") return;
    setError(null);

    const userMsg: Message = {
      id: Date.now(), role: "user", text: text.trim(),
      lang, ts: new Date().toLocaleTimeString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setTranscript("");
    setStateAndRef("thinking");

    try {
      const systemPrompt = activeProfile ? buildSystemPrompt(activeProfile) : undefined;
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), systemPrompt, language: lang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const assistantMsg: Message = {
        id: Date.now() + 1, role: "assistant", text: data.text,
        lang, ts: new Date().toLocaleTimeString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      setStateAndRef("idle");
      speak(data.text, lang);
    } catch (e) {
      setError(String(e));
      setStateAndRef("idle");
    }
  }, [state, lang, activeProfile, speak]);

  const startListening = useCallback(() => {
    if (!supported.sr) return;
    if (state === "speaking") stopSpeaking();
    if (state === "listening") {
      recognitionRef.current?.stop();
      setStateAndRef("idle");
      return;
    }

    setError(null);
    setTranscript("");

    const SpeechRecognitionAPI =
      (typeof SpeechRecognition !== "undefined" && SpeechRecognition) ||
      (typeof webkitSpeechRecognition !== "undefined" && webkitSpeechRecognition);
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = cfg.srLang;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setStateAndRef("listening");

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(final || interim);
      if (final) {
        recognition.stop();
        sendMessage(final);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setStateAndRef("idle");
      if (event.error === "no-speech") setError(cfg.errorNoSpeech);
      else if (event.error === "not-allowed") setError(cfg.errorNoMic);
      else setError(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      if (stateRef.current === "listening") setStateAndRef("idle");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [supported.sr, state, cfg, stopSpeaking, sendMessage]);

  const clearChat = () => {
    setMessages([]);
    setTranscript("");
    setError(null);
    setStateAndRef("idle");
    window.speechSynthesis.cancel();
  };

  const stateColors: Record<AssistantState, string> = {
    idle: "#6b7280", listening: "#ef4444", thinking: "#f59e0b", speaking: "#22c55e",
  };
  const stateLabels: Record<AssistantState, string> = {
    idle: cfg.tapToSpeak, listening: cfg.listeningText,
    thinking: cfg.thinkingText, speaking: cfg.speakingText,
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 520 }}>

      {/* Top bar */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: stateColors[state], boxShadow: state !== "idle" ? `0 0 8px ${stateColors[state]}` : "none" }} />
          <span className="text-xs text-gray-400">{stateLabels[state]}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {(["en", "bn"] as Language[]).map(l => (
              <button
                key={l}
                onClick={() => { setLang(l); if (state === "speaking") stopSpeaking(); }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${lang === l ? "bg-white/15 text-white" : "text-gray-500 hover:bg-white/5"}`}
              >
                <span>{LANG_CONFIG[l].flag}</span>
                <span>{LANG_CONFIG[l].label}</span>
              </button>
            ))}
          </div>
          {/* Mute toggle */}
          <button
            onClick={() => { setIsMuted(m => !m); if (!isMuted) stopSpeaking(); }}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${isMuted ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-white/10 text-gray-400 hover:bg-white/5"}`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          {/* Text mode */}
          <button
            onClick={() => setTextMode(m => !m)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${textMode ? "border-blue-500/40 bg-blue-500/10 text-blue-400" : "border-white/10 text-gray-400 hover:bg-white/5"}`}
            title="Toggle text input"
          >
            ⌨️
          </button>
          {messages.length > 0 && (
            <button onClick={clearChat} className="p-1.5 rounded-lg border border-white/10 text-gray-500 hover:text-gray-300 text-xs transition-colors" title="Clear chat">🗑️</button>
          )}
        </div>
      </div>

      {/* Active profile indicator */}
      {activeProfile && (
        <div className="mb-3 px-3 py-2 bg-white/3 border border-white/10 rounded-xl flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
          <span>👤</span>
          <span>
            {lang === "bn"
              ? `${activeProfile.name}-এর জন্য ব্যক্তিগতকৃত: ${activeProfile.age} বছর, ${activeProfile.gender}`
              : `Personalized for ${activeProfile.name}: ${activeProfile.age}y ${activeProfile.gender} · ${activeProfile.conditions?.substring(0, 50)}${(activeProfile.conditions?.length || 0) > 50 ? "..." : ""}`
            }
          </span>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ maxHeight: 320 }}>
        {messages.length === 0 && (
          <div className="text-center py-10 text-gray-600">
            <div className="text-4xl mb-3">🎙️</div>
            <p className="text-sm">
              {lang === "bn"
                ? "মাইক বোতামে চাপ দিন অথবা নিচে টাইপ করুন"
                : "Tap the mic button below or type your question"}
            </p>
            <p className="text-xs mt-2 text-gray-700">
              {lang === "bn"
                ? `বর্তমান ভাষা: বাংলা 🇧🇩`
                : `Current language: English 🇬🇧`}
            </p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600/30 text-blue-100 rounded-br-md"
                  : "bg-white/7 text-gray-200 rounded-bl-md border border-white/10"
              }`}
              style={{ direction: msg.lang === "bn" ? "ltr" : "ltr" }}
            >
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-xs text-gray-500">🤖</span>
                  <button
                    onClick={() => speak(msg.text, msg.lang)}
                    className="text-xs text-gray-600 hover:text-gray-300 transition-colors"
                    title="Read aloud"
                  >
                    🔊
                  </button>
                </div>
              )}
              <p style={{ fontFamily: msg.lang === "bn" ? "'Noto Sans Bengali', 'Hind Siliguri', sans-serif" : "inherit" }}>
                {msg.text}
              </p>
              <div className="text-xs text-gray-600 mt-1 text-right">{msg.ts}</div>
            </div>
          </div>
        ))}

        {/* Interim transcript */}
        {transcript && state === "listening" && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-blue-600/15 border border-blue-500/20 text-blue-300 text-sm italic">
              {transcript}...
            </div>
          </div>
        )}

        {/* Thinking indicator */}
        {state === "thinking" && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white/5 border border-white/10">
              <div className="flex gap-1 items-center">
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-xs text-gray-500 ml-1">{cfg.thinkingText}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300 flex-shrink-0">
          ⚠️ {error}
        </div>
      )}

      {/* Text input (when text mode or no SR support) */}
      {(textMode || !supported.sr) && (
        <div className="flex gap-2 mb-3 flex-shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(inputText)}
            placeholder={cfg.typeHere}
            disabled={state === "thinking"}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25"
            style={{ fontFamily: lang === "bn" ? "'Noto Sans Bengali', sans-serif" : "inherit" }}
          />
          <button
            onClick={() => sendMessage(inputText)}
            disabled={!inputText.trim() || state === "thinking"}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-sm font-medium text-white transition-colors"
          >
            {cfg.sendBtn}
          </button>
        </div>
      )}

      {/* Main mic button + waveform */}
      <div className="flex flex-col items-center gap-3 flex-shrink-0">
        {/* Waveform */}
        <Waveform
          active={state === "listening" || state === "speaking"}
          color={state === "speaking" ? "#22c55e" : state === "listening" ? "#ef4444" : "#374151"}
        />

        {/* Mic / Stop button */}
        <div className="relative">
          <PulseRing active={state === "listening"} />
          <button
            onClick={state === "speaking" ? stopSpeaking : startListening}
            disabled={!supported.sr && state === "thinking"}
            className="relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40"
            style={{
              background:
                state === "listening" ? "rgba(239,68,68,0.25)"
                : state === "speaking" ? "rgba(34,197,94,0.2)"
                : state === "thinking" ? "rgba(245,158,11,0.2)"
                : "rgba(255,255,255,0.07)",
              border: `2px solid ${stateColors[state]}`,
              boxShadow: state !== "idle" ? `0 0 24px ${stateColors[state]}40` : "none",
            }}
          >
            <span className="text-3xl select-none">
              {state === "listening" ? "⏹️" : state === "speaking" ? "⏸️" : state === "thinking" ? "⏳" : "🎙️"}
            </span>
          </button>
        </div>

        <p className="text-xs text-gray-600 text-center">
          {!supported.sr
            ? (lang === "bn" ? "ভয়েস সাপোর্ট নেই — টেক্সট মোড ব্যবহার করুন" : "Voice not supported — use text mode ⌨️")
            : state === "listening"
              ? (lang === "bn" ? "থামাতে চাপুন" : "Tap to stop")
              : state === "speaking"
                ? (lang === "bn" ? "থামাতে চাপুন" : "Tap to stop speaking")
                : cfg.tapToSpeak
          }
        </p>
      </div>

      {/* Bengali font hint */}
      {lang === "bn" && (
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500&display=swap"
          rel="stylesheet"
        />
      )}
    </div>
  );
}
