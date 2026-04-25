"use client";
import { useState, useCallback, useEffect } from "react";
import { PatientProfile, ResearchResult, ModelType } from "@/lib/types";
import { getAgeGroup, AGE_GROUPS, AVATARS, AVATAR_BG, AVATAR_TC, PRESETS_BY_GROUP, DEFAULT_PROFILES } from "@/lib/data";
import { buildSystemPrompt } from "@/lib/prompts";
import { Lang, t } from "@/lib/i18n";
import { Document } from "@/lib/supabase";
import ProfileCard from "@/components/ProfileCard";
import ProfileForm from "@/components/ProfileForm";
import ResearchResultComponent from "@/components/ResearchResult";
import VoiceAssistant from "@/components/VoiceAssistant";
import DocumentManager from "@/components/DocumentManager";
import AIAssistant from "@/components/AIAssistant";
import { useAuth } from "@/components/AuthProvider";
import AuthPage from "@/components/AuthPage";

type Tab = "profiles" | "research" | "results" | "documents" | "assistant" | "voice" | "settings";
type ViewMode = "list" | "add" | "edit";

const EMPTY_PROFILE: Partial<PatientProfile> = {
  name: "", age: "", gender: "Female", relationship: "",
  conditions: "", history: "", bladder: "Normal voluntary control",
  currentIssue: "", meds: "", labs: "", allergies: "", notes: "",
};

function getOrCreateSession(): string {
  if (typeof window === "undefined") return "ssr";
  let sid = localStorage.getItem("hra_session");
  if (!sid) { sid = `s_${Date.now()}_${Math.random().toString(36).slice(2)}`; localStorage.setItem("hra_session", sid); }
  return sid;
}

export default function Home() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [lang, setLang] = useState<Lang>("bn");
  const [tab, setTab] = useState<Tab>("profiles");
  const [profiles, setProfiles] = useState<PatientProfile[]>(DEFAULT_PROFILES as PatientProfile[]);
  const [activeId, setActiveId] = useState<number>(DEFAULT_PROFILES[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingProfile, setEditingProfile] = useState<Partial<PatientProfile>>(EMPTY_PROFILE);
  const [newProfile, setNewProfile] = useState<Partial<PatientProfile>>(EMPTY_PROFILE);
  const [results, setResults] = useState<Record<number, ResearchResult[]>>({});
  const [currentResultId, setCurrentResultId] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<ModelType>("anthropic");
  const [mmKey, setMmKey] = useState("");
  const [mmModel, setMmModel] = useState("MiniMax-Text-01");
  const [orKey, setOrKey] = useState("");
  const [hermesModel, setHermesModel] = useState("nousresearch/hermes-3-llama-3.1-70b");
  const [sessionId, setSessionId] = useState("ssr");
  const [allDocuments, setAllDocuments] = useState<Record<number, Document[]>>({});

  const tx = t(lang);

  useEffect(() => {
    if (user) {
      setSessionId(user.id);
    } else if (!authLoading) {
      setSessionId(getOrCreateSession());
    }
  }, [user, authLoading]);

  const activeProfile = profiles.find(p => p.id === activeId) || profiles[0];
  const profileResults = results[activeProfile?.id] || [];
  const currentResult = profileResults.find(r => r.id === currentResultId[activeProfile?.id]) || null;
  const ag = getAgeGroup(activeProfile?.age || "30");
  const presets = PRESETS_BY_GROUP[ag] || PRESETS_BY_GROUP.adult;
  const modelLabel = model === "anthropic" ? "Claude Sonnet 4" : model === "minimax" ? mmModel : hermesModel;
  const activeDocuments = allDocuments[activeProfile?.id] || [];

  const runResearch = useCallback(async (query: string) => {
    if (!query.trim() || loading || !activeProfile) return;
    setLoading(true); setError(null); setTab("results");
    try {
      const system = buildSystemPrompt(activeProfile);
      let text = "";
      if (model === "anthropic") {
        const res = await fetch("/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, messages: [{ role: "user", content: query }] }) });
        const data = await res.json(); if (data.error) throw new Error(data.error); text = data.text;
      } else if (model === "minimax") {
        const res = await fetch("/api/minimax", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: mmKey, model: mmModel, messages: [{ role: "system", content: system }, { role: "user", content: query }] }) });
        const data = await res.json(); if (data.error) throw new Error(data.error); text = data.text;
      } else {
        const res = await fetch("/api/hermes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: orKey, model: hermesModel, messages: [{ role: "system", content: system }, { role: "user", content: query }] }) });
        const data = await res.json(); if (data.error) throw new Error(data.error); text = data.text;
      }
      const nr: ResearchResult = { id: Date.now(), query, text, ts: new Date().toLocaleString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" }), model, patientId: activeProfile.id };
      setResults(prev => ({ ...prev, [activeProfile.id]: [nr, ...(prev[activeProfile.id] || [])] }));
      setCurrentResultId(prev => ({ ...prev, [activeProfile.id]: nr.id }));
    } catch (e) { setError(String(e)); }
    setLoading(false);
  }, [loading, activeProfile, model, mmKey, mmModel, orKey, hermesModel]);

  const saveNew = () => {
    if (!newProfile.name || !newProfile.age) return alert(tx.profiles.nameRequired);
    const p: PatientProfile = { ...EMPTY_PROFILE as PatientProfile, ...newProfile, id: Date.now() };
    setProfiles(prev => [...prev, p]); setActiveId(p.id);
    setNewProfile(EMPTY_PROFILE); setViewMode("list"); setTab("research");
  };

  const saveEdit = () => {
    if (!editingProfile.id) return;
    setProfiles(prev => prev.map(p => p.id === editingProfile.id ? { ...p, ...editingProfile } as PatientProfile : p));
    setViewMode("list"); setEditingProfile(EMPTY_PROFILE);
  };

  const deleteProfile = (id: number) => {
    if (profiles.length <= 1) return;
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeId === id) setActiveId(profiles.find(p => p.id !== id)!.id);
  };

  // Profile form fields translated
  const FIELDS: { key: keyof PatientProfile; textarea?: boolean }[] = [
    { key: "name" }, { key: "age" }, { key: "gender" }, { key: "relationship" },
    { key: "conditions", textarea: true }, { key: "history", textarea: true },
    { key: "bladder", textarea: true }, { key: "currentIssue", textarea: true },
    { key: "meds", textarea: true }, { key: "labs", textarea: true },
    { key: "allergies" }, { key: "notes", textarea: true },
  ];

  const renderProfileForm = (profileData: Partial<PatientProfile>, isEdit: boolean) => (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white">{isEdit ? tx.profiles.formTitle.edit : tx.profiles.formTitle.add}</h2>
        <button onClick={() => { setViewMode("list"); setEditingProfile(EMPTY_PROFILE); }}
          className="text-xs text-gray-400 border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">{tx.profiles.cancel}</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(f => {
          const label = tx.fields[f.key as keyof typeof tx.fields] as string;
          const ph = (tx.fields.ph as Record<string, string>)[f.key] || "";
          const val = (profileData[f.key] as string) || "";
          const onChange = (v: string) => isEdit ? setEditingProfile(p => ({ ...p, [f.key]: v })) : setNewProfile(p => ({ ...p, [f.key]: v }));
          return (
            <div key={f.key} className={f.textarea ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
              {f.textarea
                ? <textarea rows={2} value={val} onChange={e => onChange(e.target.value)} placeholder={ph} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 resize-y" />
                : <input type="text" value={val} onChange={e => onChange(e.target.value)} placeholder={ph} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30" />}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={isEdit ? saveEdit : saveNew} className="px-5 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          {isEdit ? tx.profiles.save.edit : tx.profiles.save.add}
        </button>
        <button onClick={() => { setViewMode("list"); setEditingProfile(EMPTY_PROFILE); }} className="px-5 py-2 border border-white/20 text-gray-400 rounded-lg text-sm hover:bg-white/10 transition-colors">{tx.profiles.cancel}</button>
      </div>
    </div>
  );

  const TAB_ORDER: Tab[] = ["profiles", "research", "documents", "assistant", "voice", "results", "settings"];

  // Show loading spinner while checking auth
  if (authLoading) return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  // Show auth page if not logged in
  if (!user) return <AuthPage lang={lang} onLangChange={setLang} />;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="max-w-3xl mx-auto px-4 py-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-white">{tx.appTitle}</h1>
            <p className="text-xs text-gray-500 mt-0.5">{tx.appSubtitle} · {tx.profiles.count(profiles.length)}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              {(["bn", "en"] as Lang[]).map(l => (
                <button key={l} onClick={() => setLang(l)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${lang === l ? "bg-white/15 text-white" : "text-gray-500 hover:bg-white/5"}`}>
                  {l === "bn" ? "🇧🇩 বাংলা" : "🇬🇧 EN"}
                </button>
              ))}
            </div>
            {activeProfile && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full">
                <span className="text-base">{AVATARS[ag]}</span>
                <span className="text-sm text-gray-300">{activeProfile.name}</span>
              </div>
            )}
            {loading && <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
            {user && (
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-xs text-gray-500 truncate max-w-[120px]">{user.email}</span>
                <button onClick={signOut}
                  className="text-xs border border-white/10 px-2.5 py-1.5 rounded-lg text-gray-400 hover:bg-white/5 hover:text-red-400 transition-colors">
                  {lang === "bn" ? "লগআউট" : "Sign out"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {TAB_ORDER.map(t2 => {
            const labels: Record<Tab, string> = {
              profiles: `${tx.tabs.profiles} (${profiles.length})`,
              research: tx.tabs.research,
              documents: tx.tabs.documents,
              assistant: tx.tabs.assistant,
              voice: tx.tabs.voice,
              results: `${tx.tabs.results}${currentResult ? " ✓" : ""}`,
              settings: tx.tabs.settings,
            };
            const isSpecial = t2 === "voice" || t2 === "assistant" || t2 === "documents";
            return (
              <button key={t2} onClick={() => setTab(t2)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  tab === t2
                    ? isSpecial ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                    : "bg-transparent text-gray-400 border-white/10 hover:bg-white/5"
                }`}>
                {labels[t2]}
              </button>
            );
          })}
        </div>

        {/* ── PROFILES ── */}
        {tab === "profiles" && (
          <div>
            {viewMode === "add" && renderProfileForm(newProfile, false)}
            {viewMode === "edit" && renderProfileForm(editingProfile, true)}
            {viewMode === "list" && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-400">{tx.profiles.count(profiles.length)}</p>
                  <button onClick={() => setViewMode("add")} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">{tx.profiles.add}</button>
                </div>
                <div className="space-y-3">
                  {profiles.map(p => (
                    <ProfileCard key={p.id} profile={p} isActive={p.id === activeId}
                      resultCount={(results[p.id] || []).length}
                      onSelect={() => { setActiveId(p.id); setTab("research"); }}
                      onEdit={() => { setEditingProfile({ ...p }); setViewMode("edit"); }}
                      onDelete={() => deleteProfile(p.id)} canDelete={profiles.length > 1}
                      lang={lang} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── RESEARCH ── */}
        {tab === "research" && (
          <div>
            <div className="flex items-center gap-3 p-3 bg-white/3 border border-white/10 rounded-xl mb-5">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ background: AVATAR_BG[ag], color: AVATAR_TC[ag] }}>{AVATARS[ag]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{activeProfile?.name} <span className="text-gray-400 font-normal">· {activeProfile?.age}y · {(tx.ageGroups as Record<string, string>)[ag]}</span></p>
                <p className="text-xs text-gray-500 truncate">{activeProfile?.conditions?.substring(0, 70)}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{modelLabel}</span>
                <button onClick={() => setTab("profiles")} className="text-xs border border-white/20 px-2.5 py-1 rounded-lg text-gray-400 hover:bg-white/10">{tx.research.switch}</button>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">{tx.research.topics}</p>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {presets.map(p => (
                <button key={p.id} onClick={() => runResearch(p.query)} disabled={loading}
                  className="bg-white/3 border border-white/10 rounded-xl p-3 text-left hover:border-blue-500/40 hover:bg-blue-500/5 transition-all disabled:opacity-40">
                  <div className="text-xl mb-2">{p.emoji}</div>
                  <div className="text-sm font-medium text-white">{p.label}</div>
                </button>
              ))}
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">{tx.research.custom}</p>
            <textarea id="cq" rows={4} placeholder={tx.research.placeholder(activeProfile?.name || "")}
              className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 resize-y mb-3" />
            <div className="flex items-center gap-3">
              <button onClick={() => { const q = (document.getElementById("cq") as HTMLTextAreaElement)?.value; if (q?.trim()) runResearch(q); }} disabled={loading}
                className="px-5 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-40">
                {loading ? tx.research.running : tx.research.run}
              </button>
              <span className="text-xs text-gray-500">{tx.research.personalizedFor(activeProfile?.name || "")}</span>
            </div>
          </div>
        )}

        {/* ── DOCUMENTS ── */}
        {tab === "documents" && (
          <div>
            <div className="flex items-center gap-3 p-3 bg-white/3 border border-white/10 rounded-xl mb-4">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0" style={{ background: AVATAR_BG[ag], color: AVATAR_TC[ag] }}>{AVATARS[ag]}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{activeProfile?.name} · {lang === "bn" ? "নথিপত্র" : "Documents"}</p>
                <p className="text-xs text-gray-500">{activeDocuments.length} {lang === "bn" ? "টি ফাইল" : "files"} · {activeDocuments.filter(d => d.ai_summary).length} {lang === "bn" ? "টি বিশ্লেষিত" : "analyzed"}</p>
              </div>
              <button onClick={() => setTab("profiles")} className="text-xs border border-white/20 px-2.5 py-1 rounded-lg text-gray-400 hover:bg-white/10">{tx.research.switch}</button>
            </div>
            <DocumentManager
              profile={activeProfile}
              sessionId={sessionId}
              userId={user?.id}
              lang={lang}
              onDocumentsChange={docs => setAllDocuments(prev => ({ ...prev, [activeProfile.id]: docs }))}
            />
          </div>
        )}

        {/* ── AI ASSISTANT ── */}
        {tab === "assistant" && (
          <div className="bg-white/3 border border-white/10 rounded-xl p-4">
            <AIAssistant
              profile={activeProfile}
              documents={activeDocuments}
              lang={lang}
              onRunResearch={query => { setTab("research"); setTimeout(() => runResearch(query), 100); }}
            />
          </div>
        )}

        {/* ── VOICE ── */}
        {tab === "voice" && (
          <div className="bg-white/3 border border-white/10 rounded-xl p-5">
            <VoiceAssistant activeProfile={activeProfile} defaultLang={lang} />
          </div>
        )}

        {/* ── RESULTS ── */}
        {tab === "results" && (
          <div>
            {loading && (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <p className="text-sm text-gray-400">{lang === "bn" ? `${activeProfile?.name}-এর জন্য গবেষণা করা হচ্ছে...` : `Researching for ${activeProfile?.name}...`}</p>
              </div>
            )}
            {!loading && error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-sm font-medium text-red-400 mb-1">{tx.results.error}</p>
                <p className="text-sm text-red-300">{error}</p>
                <button onClick={() => setTab("research")} className="mt-3 text-xs text-blue-400 hover:underline">{tx.results.backToResearch}</button>
              </div>
            )}
            {!loading && !error && !currentResult && (
              <div className="text-center py-20">
                <div className="text-4xl mb-4">🔬</div>
                <p className="text-sm text-gray-400 mb-2">{tx.results.noResults}</p>
                <button onClick={() => setTab("research")} className="text-sm text-blue-400 hover:underline">{tx.results.startResearch}</button>
              </div>
            )}
            {!loading && !error && currentResult && (
              <>
                <div className="flex items-center gap-3 p-3 bg-white/3 border border-white/10 rounded-xl mb-4">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: AVATAR_BG[ag], color: AVATAR_TC[ag] }}>{AVATARS[ag]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{currentResult.ts} · {activeProfile?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{currentResult.query.substring(0, 100)}...</p>
                  </div>
                </div>
                <ResearchResultComponent text={currentResult.text} />
                {/* Research follow-up with assistant */}
                <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                  <p className="text-xs text-green-400 font-medium mb-2">
                    {lang === "bn" ? "🤖 এই গবেষণা সম্পর্কে আরো জানতে AI সহকারীকে জিজ্ঞেস করুন" : "🤖 Ask the AI Assistant for more insights on this research"}
                  </p>
                  <button onClick={() => setTab("assistant")} className="text-xs text-green-300 hover:text-green-200 transition-colors">
                    {lang === "bn" ? "AI সহকারীতে যান →" : "Open AI Assistant →"}
                  </button>
                </div>
                {profileResults.filter(r => r.id !== currentResult.id).length > 0 && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">{tx.research.prevSessions(activeProfile?.name || "")}</p>
                    {profileResults.filter(r => r.id !== currentResult.id).map(r => (
                      <button key={r.id} onClick={() => setCurrentResultId(prev => ({ ...prev, [activeProfile.id]: r.id }))}
                        className="w-full text-left bg-white/3 border border-white/10 rounded-xl p-3 mb-2 hover:bg-white/5">
                        <p className="text-xs text-gray-500">{r.ts}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{r.query.substring(0, 90)}...</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SETTINGS ── */}
        {tab === "settings" && (
          <div className="space-y-4">
            <div className="bg-white/3 border border-white/10 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-3">{tx.settings.language}</p>
              <div className="flex gap-2">
                {(["bn", "en"] as Lang[]).map(l => (
                  <button key={l} onClick={() => setLang(l)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${lang === l ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-white/3 text-gray-400 border-white/10 hover:bg-white/5"}`}>
                    {l === "bn" ? "🇧🇩 " + tx.settings.langBn : "🇬🇧 " + tx.settings.langEn}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white/3 border border-white/10 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-3">{tx.settings.model}</p>
              <div className="flex gap-2 flex-wrap">
                {(["anthropic", "minimax", "hermes"] as ModelType[]).map(m => (
                  <button key={m} onClick={() => setModel(m)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${model === m ? "bg-green-500/20 text-green-400 border-green-500/40" : "bg-white/3 text-gray-400 border-white/10 hover:bg-white/5"}`}>
                    {m === "anthropic" ? "Claude Sonnet 4" : m === "minimax" ? "MiniMax M2.7" : "Hermes / OpenRouter"}
                  </button>
                ))}
              </div>
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-300">{tx.settings.modelNote}</div>
            </div>
            <div className="bg-white/3 border border-white/10 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-3">{tx.settings.supabaseNote}</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">{tx.settings.supabaseUrl}</label>
                  <input type="text" readOnly defaultValue={process.env.NEXT_PUBLIC_SUPABASE_URL || "Set NEXT_PUBLIC_SUPABASE_URL in Vercel"} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-default" />
                </div>
              </div>
            </div>
            <div className="bg-white/3 border border-white/10 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-3">MiniMax M2.7</p>
              <div className="space-y-3">
                <div><label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">{tx.settings.mmKey}</label>
                  <input type="password" value={mmKey} onChange={e => setMmKey(e.target.value)} placeholder="MiniMax API key" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30" /></div>
                <div><label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">{tx.settings.mmModel}</label>
                  <input type="text" value={mmModel} onChange={e => setMmModel(e.target.value)} placeholder="MiniMax-Text-01" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30" /></div>
              </div>
            </div>
            <div className="bg-white/3 border border-white/10 rounded-xl p-4">
              <p className="text-sm font-medium text-white mb-3">Hermes / OpenRouter</p>
              <div className="space-y-3">
                <div><label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">{tx.settings.orKey}</label>
                  <input type="password" value={orKey} onChange={e => setOrKey(e.target.value)} placeholder="OpenRouter API key" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30" /></div>
                <div><label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">{tx.settings.hermesModel}</label>
                  <input type="text" value={hermesModel} onChange={e => setHermesModel(e.target.value)} placeholder="nousresearch/hermes-3-llama-3.1-70b" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30" /></div>
              </div>
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-sm font-medium text-yellow-400 mb-2">{tx.settings.disclaimer}</p>
              <p className="text-xs text-gray-400 leading-relaxed">{tx.settings.disclaimerText}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
