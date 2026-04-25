"use client";
import { useState, useEffect, useRef } from "react";
import { PatientProfile } from "@/lib/types";
import { Document, isSupabaseConfigured } from "@/lib/supabase";
import { Lang, t } from "@/lib/i18n";

interface Props {
  profile: PatientProfile;
  sessionId: string;
  userId?: string | null;
  lang: Lang;
  onDocumentsChange?: (docs: Document[]) => void;
}

const CATEGORIES = ["report", "prescription", "other"] as const;
type Category = typeof CATEGORIES[number];

export default function DocumentManager({ profile, sessionId, userId, lang, onDocumentsChange }: Props) {
  const tx = t(lang);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [trendAnalysis, setTrendAnalysis] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [uploadCategory, setUploadCategory] = useState<Category>("report");
  const [uploadDate, setUploadDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const supabaseOk = isSupabaseConfigured();

  useEffect(() => {
    if (supabaseOk) fetchDocs();
  }, [profile.id, sessionId]);

  async function fetchDocs() {
    try {
      const userParam = userId ? `&userId=${userId}` : `&sessionId=${sessionId}`;
      const res = await fetch(`/api/documents?profileId=${profile.id}${userParam}`);
      const data = await res.json();
      if (data.documents) {
        setDocs(data.documents);
        onDocumentsChange?.(data.documents);
      }
    } catch { /* silently fail */ }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !supabaseOk) return;
    setUploading(true); setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("sessionId", sessionId);
      if (userId) form.append("userId", userId);
      form.append("profileId", String(profile.id));
      form.append("profileName", profile.name);
      form.append("category", uploadCategory);
      if (uploadDate) form.append("reportDate", uploadDate);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newDocs = [data.document, ...docs];
      setDocs(newDocs); onDocumentsChange?.(newDocs);
      if (fileRef.current) fileRef.current.value = "";
      setUploadDate("");
    } catch (err) { setError(String(err)); }
    setUploading(false);
  }

  async function analyzeDoc(doc: Document) {
    setAnalyzing(doc.id); setError(null);
    try {
      const res = await fetch("/api/analyze-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, fileUrl: doc.file_url, fileType: doc.file_type, patientProfile: profile, language: lang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, ai_summary: data.summary, ai_values: data.aiValues } : d));
    } catch (err) { setError(String(err)); }
    setAnalyzing(null);
  }

  async function compareReports() {
    setComparing(true); setError(null); setTrendAnalysis(null);
    try {
      const res = await fetch("/api/compare-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, sessionId, userId, patientProfile: profile, language: lang }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTrendAnalysis(data.analysis);
    } catch (err) { setError(String(err)); }
    setComparing(false);
  }

  async function deleteDoc(doc: Document) {
    if (!confirm(tx.docs.deleteConfirm)) return;
    try {
      await fetch(`/api/documents?id=${doc.id}&filePath=${encodeURIComponent(doc.file_path)}`, { method: "DELETE" });
      const newDocs = docs.filter(d => d.id !== doc.id);
      setDocs(newDocs); onDocumentsChange?.(newDocs);
    } catch (err) { setError(String(err)); }
  }

  const filteredDocs = filter === "all" ? docs : docs.filter(d => d.category === filter);
  const reportCount = docs.filter(d => d.category === "report" && d.ai_values).length;

  const CAT_COLORS: Record<string, string> = {
    report: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    prescription: "bg-green-500/15 text-green-300 border-green-500/30",
    other: "bg-gray-500/15 text-gray-300 border-gray-500/30",
  };
  const CAT_LABELS: Record<string, string> = {
    report: tx.docs.categories.report,
    prescription: tx.docs.categories.prescription,
    other: tx.docs.categories.other,
  };

  if (!supabaseOk) {
    return (
      <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
        <div className="text-3xl mb-3">⚙️</div>
        <p className="text-sm text-yellow-300 font-medium mb-2">{tx.docs.noSupabase}</p>
        <p className="text-xs text-gray-400">
          {lang === "bn"
            ? "Vercel env-এ NEXT_PUBLIC_SUPABASE_URL এবং NEXT_PUBLIC_SUPABASE_ANON_KEY যোগ করুন"
            : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel env vars"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload section */}
      <div className="bg-white/3 border border-white/10 rounded-xl p-4">
        <p className="text-sm font-medium text-white mb-3">
          {lang === "bn" ? "নতুন নথি আপলোড করুন" : "Upload New Document"}
        </p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">{tx.docs.catLabel}</label>
            <select
              value={uploadCategory}
              onChange={e => setUploadCategory(e.target.value as Category)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">{tx.docs.dateLabel}</label>
            <input
              type="date"
              value={uploadDate}
              onChange={e => setUploadDate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleUpload} className="hidden" id="file-upload" />
        <label
          htmlFor="file-upload"
          className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed text-sm cursor-pointer transition-colors ${
            uploading ? "border-white/10 text-gray-500" : "border-white/20 text-gray-300 hover:border-white/40 hover:text-white"
          }`}
        >
          {uploading ? (
            <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />{tx.docs.uploading}</>
          ) : (
            <><span className="text-xl">📎</span>{tx.docs.upload} (image / PDF)</>
          )}
        </label>
        {error && <p className="text-xs text-red-400 mt-2">⚠️ {error}</p>}
      </div>

      {/* Filter tabs */}
      {docs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(["all", ...CATEGORIES] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                filter === f ? "bg-white/15 text-white border-white/30" : "bg-transparent text-gray-400 border-white/10 hover:bg-white/5"
              }`}>
              {f === "all" ? tx.docs.categories.all : CAT_LABELS[f]}
              <span className="ml-1.5 text-gray-500">({f === "all" ? docs.length : docs.filter(d => d.category === f).length})</span>
            </button>
          ))}
        </div>
      )}

      {/* Compare reports button */}
      {reportCount >= 2 && (
        <button onClick={compareReports} disabled={comparing}
          className="w-full py-3 bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-500/30 rounded-xl text-sm font-medium text-blue-300 hover:from-blue-600/40 hover:to-purple-600/40 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
          {comparing ? (
            <><div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />{tx.docs.compareLoading}</>
          ) : (
            <><span>📊</span>{tx.docs.compareBtn} ({reportCount} {lang === "bn" ? "টি বিশ্লেষিত রিপোর্ট" : "analyzed reports"})</>
          )}
        </button>
      )}

      {/* Trend Analysis */}
      {trendAnalysis && (
        <div className="bg-white/3 border border-purple-500/20 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20 flex items-center justify-between">
            <span className="text-sm font-medium text-purple-300">📊 {tx.docs.trendTitle}</span>
            <button onClick={() => setTrendAnalysis(null)} className="text-gray-500 hover:text-gray-300 text-xs">✕</button>
          </div>
          <div className="p-4">
            {trendAnalysis.split("\n").map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-2" />;
              const isSectionHeader = line.startsWith("📊") || line.startsWith("✅") || line.startsWith("⚠️") || line.startsWith("🔍") || line.startsWith("💊") || line.startsWith("🏥") || line.startsWith("🌿") || line.startsWith("⚡");
              if (isSectionHeader) return <div key={i} className="mt-4 mb-2 text-sm font-semibold text-white">{line}</div>;
              if (line.startsWith("- ") || line.startsWith("• ")) return (
                <div key={i} className="flex gap-2 items-start py-0.5">
                  <span className="text-blue-400 text-xs mt-1.5 flex-shrink-0">▸</span>
                  <span className="text-sm text-gray-300 leading-relaxed">{line.slice(2)}</span>
                </div>
              );
              return <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>;
            })}
          </div>
        </div>
      )}

      {/* Documents list */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-10 text-gray-600">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-sm">{tx.docs.noFiles}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white/3 border border-white/10 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl flex-shrink-0">
                  {doc.file_type === "pdf" ? "📄" : "🖼️"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${CAT_COLORS[doc.category]}`}>
                      {CAT_LABELS[doc.category]}
                    </span>
                    {doc.report_date && <span className="text-xs text-gray-500">{doc.report_date}</span>}
                    {doc.ai_summary && <span className="text-xs text-green-400">✓ AI analyzed</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                    className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs transition-colors" title={tx.docs.viewFile}>
                    🔗
                  </a>
                  {!doc.ai_summary && (
                    <button onClick={() => analyzeDoc(doc)} disabled={analyzing === doc.id}
                      className="p-1.5 rounded-lg border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs transition-colors disabled:opacity-40" title={tx.docs.analyzeBtn}>
                      {analyzing === doc.id ? <div className="w-3 h-3 border border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> : "🔬"}
                    </button>
                  )}
                  <button onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                    className="p-1.5 rounded-lg border border-white/10 text-gray-400 hover:bg-white/5 text-xs transition-colors">
                    {expandedDoc === doc.id ? "▲" : "▼"}
                  </button>
                  <button onClick={() => deleteDoc(doc)}
                    className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs transition-colors">✕</button>
                </div>
              </div>

              {/* Expanded AI Summary */}
              {expandedDoc === doc.id && (
                <div className="border-t border-white/5 px-4 py-3 bg-white/2">
                  {doc.ai_summary ? (
                    <>
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{tx.docs.aiSummary}</p>
                      <p className="text-sm text-gray-300 leading-relaxed mb-3">{doc.ai_summary}</p>
                      {doc.ai_values && Object.keys(doc.ai_values).length > 0 && (
                        <>
                          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                            {lang === "bn" ? "মূল মান" : "Key Values"}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries((doc.ai_values as unknown) as Record<string, {value: string; unit?: string; status?: string; flag?: boolean}>).slice(0, 8).map(([key, val]) => {
                              const v = typeof val === "object" ? val : { value: String(val) };
                              const statusColor = v.status === "high" ? "text-red-400" : v.status === "low" ? "text-yellow-400" : "text-green-400";
                              return (
                                <div key={key} className="bg-white/5 rounded-lg px-3 py-2">
                                  <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, " ")}</p>
                                  <p className={`text-sm font-medium ${v.flag ? "text-red-300" : "text-white"}`}>
                                    {v.value} {v.unit && <span className="text-xs text-gray-400">{v.unit}</span>}
                                    {v.status && <span className={`ml-1 text-xs ${statusColor}`}>({v.status})</span>}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-gray-400 flex-1">
                        {lang === "bn" ? "এখনো AI বিশ্লেষণ করা হয়নি" : "Not yet analyzed by AI"}
                      </p>
                      <button onClick={() => analyzeDoc(doc)} disabled={analyzing === doc.id}
                        className="px-3 py-1.5 bg-blue-600/30 border border-blue-500/30 rounded-lg text-xs text-blue-300 hover:bg-blue-600/40 transition-colors disabled:opacity-40">
                        {analyzing === doc.id ? tx.docs.analyzing : tx.docs.analyzeBtn}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
