"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { PatientProfile } from "@/lib/types";
import { Document } from "@/lib/supabase";
import { Lang, t } from "@/lib/i18n";

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

interface Props {
  profile: PatientProfile | null;
  documents: Document[];
  lang: Lang;
  onRunResearch?: (query: string) => void;
}

export default function AIAssistant({ profile, documents, lang, onRunResearch }: Props) {
  const tx = t(lang);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now(), role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput(""); setError(null); setLoading(true);
    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.text }));
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: text }],
          patientProfile: profile,
          documents: documents.filter(d => d.ai_summary),
          language: lang,
          conversationHistory: history,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { id: Date.now() + 1, role: "assistant", text: data.text }]);
    } catch (e) { setError(String(e)); }
    setLoading(false);
  }, [loading, messages, profile, documents, lang]);

  const QUICK_ACTIONS = [
    {
      label: lang === "bn" ? "📊 রিপোর্ট বিশ্লেষণ" : "📊 Analyze Reports",
      query: lang === "bn"
        ? `${profile?.name || "রোগীর"} সর্বশেষ রিপোর্টে কী পাওয়া গেছে? কী ভালো আছে, কী খারাপ আছে?`
        : `What does ${profile?.name || "the patient"}'s latest report show? What's good, what's concerning?`,
    },
    {
      label: lang === "bn" ? "💊 ওষুধ সম্পর্কে" : "💊 About Medications",
      query: lang === "bn"
        ? `${profile?.name || "রোগী"}-এর বর্তমান ওষুধগুলোর পার্শ্বপ্রতিক্রিয়া কী? কোনো মিথস্ক্রিয়া আছে?`
        : `What are the side effects and interactions of ${profile?.name || "the patient"}'s current medications?`,
    },
    {
      label: lang === "bn" ? "🥗 খাদ্যতালিকা" : "🥗 Diet Guide",
      query: lang === "bn"
        ? `${profile?.name || "রোগী"}-এর অবস্থায় কোন খাবার খাওয়া উচিত এবং কোনটি এড়ানো উচিত?`
        : `What foods should ${profile?.name || "the patient"} eat or avoid given their conditions?`,
    },
    {
      label: lang === "bn" ? "🚨 জরুরি লক্ষণ" : "🚨 Warning Signs",
      query: lang === "bn"
        ? `${profile?.name || "রোগী"}-এর ক্ষেত্রে কোন লক্ষণগুলো দেখলে তাৎক্ষণিক ডাক্তার দেখাতে হবে?`
        : `What symptoms should trigger immediate medical attention for ${profile?.name || "the patient"}?`,
    },
    {
      label: lang === "bn" ? "🔬 গভীর গবেষণা" : "🔬 Deep Research",
      query: lang === "bn"
        ? `${profile?.name || "রোগী"}-এর ${profile?.currentIssue || "সমস্যা"} সমাধানে সর্বশেষ চিকিৎসা বিজ্ঞান কী বলে?`
        : `What does the latest medical science say about managing ${profile?.name || "the patient"}'s ${profile?.currentIssue || "condition"}?`,
    },
    {
      label: lang === "bn" ? "🧘 দৈনন্দিন যত্ন" : "🧘 Daily Care",
      query: lang === "bn"
        ? `${profile?.name || "রোগী"}-এর জন্য একটি দৈনন্দিন যত্নের রুটিন তৈরি করুন।`
        : `Create a daily care routine for ${profile?.name || "the patient"} based on their conditions.`,
    },
  ];

  const analyzedDocs = documents.filter(d => d.ai_summary).length;

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 560 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <p className="text-sm font-medium text-white">{tx.assistant.title}</p>
          <p className="text-xs text-gray-500">{tx.assistant.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {analyzedDocs > 0 && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
              📎 {analyzedDocs} {lang === "bn" ? "টি নথি" : "docs"}
            </span>
          )}
          {messages.length > 0 && (
            <button onClick={() => setMessages([])}
              className="text-xs text-gray-500 border border-white/10 px-2 py-1 rounded-lg hover:bg-white/5 transition-colors">
              {tx.assistant.clearChat}
            </button>
          )}
        </div>
      </div>

      {/* Quick action buttons */}
      {messages.length === 0 && (
        <div className="mb-4 flex-shrink-0">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            {lang === "bn" ? "দ্রুত প্রশ্ন" : "Quick actions"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map((a, i) => (
              <button key={i} onClick={() => send(a.query)}
                className="bg-white/3 border border-white/10 rounded-xl px-3 py-2.5 text-left text-xs text-gray-300 hover:bg-white/5 hover:border-white/20 transition-colors">
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ maxHeight: 340 }}>
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-600">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-sm text-gray-500">{tx.assistant.empty}</p>
            {profile && (
              <p className="text-xs text-gray-600 mt-1">
                {lang === "bn" ? `${profile.name}-এর জন্য সক্রিয়` : `Active for ${profile.name}`}
              </p>
            )}
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600/30 text-blue-100 rounded-br-md"
                : "bg-white/5 text-gray-200 rounded-bl-md border border-white/8"
            }`}>
              {msg.role === "assistant" && msg.text.includes("💡") ? (
                <>
                  <p className="text-sm leading-relaxed mb-2">
                    {msg.text.split("💡")[0]}
                  </p>
                  <div className="border-t border-white/10 pt-2 mt-2">
                    <p className="text-xs text-gray-400 mb-1.5">💡 {lang === "bn" ? "আরো জানুন:" : "Explore further:"}</p>
                    {msg.text.split("💡")[1]?.split(/\n/)
                      .filter(l => l.trim())
                      .slice(0, 4)
                      .map((suggestion, i) => {
                        const clean = suggestion.replace(/^[-•\d.]\s*/, "").trim();
                        if (!clean) return null;
                        return (
                          <button key={i} onClick={() => send(clean)}
                            className="block w-full text-left text-xs text-blue-300 hover:text-blue-200 py-1 hover:bg-white/5 rounded px-1 transition-colors">
                            → {clean}
                          </button>
                        );
                      })}
                  </div>
                </>
              ) : (
                msg.text.split("\n").map((line, i) => {
                  if (!line.trim()) return <div key={i} className="h-1" />;
                  if (line.startsWith("- ") || line.startsWith("• ")) return (
                    <div key={i} className="flex gap-2 items-start py-0.5">
                      <span className="text-blue-400 text-xs mt-1 flex-shrink-0">▸</span>
                      <span>{line.slice(2)}</span>
                    </div>
                  );
                  return <p key={i} className="leading-relaxed">{line}</p>;
                })
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white/5 border border-white/10">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map(d => (
                  <div key={d} className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
                <span className="text-xs text-gray-500 ml-1">{tx.assistant.thinking}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-300">
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 flex-shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
          placeholder={tx.assistant.placeholder}
          disabled={loading}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/25"
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl text-sm font-medium text-white transition-colors">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : tx.assistant.send}
        </button>
      </div>
    </div>
  );
}
