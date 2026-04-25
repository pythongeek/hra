"use client";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Lang, t } from "@/lib/i18n";

interface Props {
  lang: Lang;
  onLangChange: (l: Lang) => void;
}

export default function AuthPage({ lang, onLangChange }: Props) {
  const tx = t(lang);
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const BN = lang === "bn";

  async function handleSubmit() {
    setError(null); setSuccess(null);
    if (!email || !password) {
      setError(BN ? "ইমেইল এবং পাসওয়ার্ড আবশ্যক" : "Email and password are required");
      return;
    }
    if (mode === "register") {
      if (!name) { setError(BN ? "নাম আবশ্যক" : "Name is required"); return; }
      if (password !== confirm) { setError(BN ? "পাসওয়ার্ড মিলছে না" : "Passwords do not match"); return; }
      if (password.length < 6) { setError(BN ? "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে" : "Password must be at least 6 characters"); return; }
    }
    setLoading(true);
    if (mode === "register") {
      const { error: e } = await signUp(email, password, name);
      if (e) setError(e);
      else setSuccess(BN ? "✅ একাউন্ট তৈরি হয়েছে! আপনার ইমেইল যাচাই করুন।" : "✅ Account created! Please check your email to verify.");
    } else {
      const { error: e } = await signIn(email, password);
      if (e) setError(BN ? "ইমেইল বা পাসওয়ার্ড ভুল" : "Invalid email or password");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔬</div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {BN ? "স্বাস্থ্য গবেষণা সহকারী" : "Health Research Agent"}
          </h1>
          <p className="text-sm text-gray-500">
            {BN ? "আপনার পরিবারের স্বাস্থ্য ব্যবস্থাপনার জন্য AI সহকারী" : "AI assistant for your family's health management"}
          </p>

          {/* Language toggle */}
          <div className="flex justify-center mt-4">
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              {(["bn", "en"] as Lang[]).map(l => (
                <button key={l} onClick={() => onLangChange(l)}
                  className={`px-4 py-1.5 text-xs font-medium transition-colors ${lang === l ? "bg-white/15 text-white" : "text-gray-500 hover:bg-white/5"}`}>
                  {l === "bn" ? "🇧🇩 বাংলা" : "🇬🇧 English"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
          {/* Mode tabs */}
          <div className="flex rounded-xl border border-white/10 overflow-hidden mb-6">
            {(["login", "register"] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${mode === m ? "bg-white/15 text-white" : "text-gray-500 hover:bg-white/5"}`}>
                {m === "login" ? (BN ? "লগইন" : "Login") : (BN ? "রেজিস্ট্রেশন" : "Register")}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">
                  {BN ? "পূর্ণ নাম" : "Full Name"}
                </label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder={BN ? "আপনার নাম লিখুন" : "Enter your full name"}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30" />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">
                {BN ? "ইমেইল" : "Email"}
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={BN ? "আপনার ইমেইল লিখুন" : "Enter your email"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">
                {BN ? "পাসওয়ার্ড" : "Password"}
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder={BN ? "পাসওয়ার্ড লিখুন" : "Enter password"}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30" />
            </div>
            {mode === "register" && (
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5">
                  {BN ? "পাসওয়ার্ড নিশ্চিত করুন" : "Confirm Password"}
                </label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder={BN ? "পাসওয়ার্ড আবার লিখুন" : "Re-enter password"}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30" />
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-300">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="mt-4 px-4 py-2.5 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-300">
              {success}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full mt-5 py-3 bg-white text-black rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {loading
              ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />{BN ? "অপেক্ষা করুন..." : "Please wait..."}</>
              : mode === "login" ? (BN ? "লগইন করুন" : "Sign In") : (BN ? "একাউন্ট তৈরি করুন" : "Create Account")
            }
          </button>

          {mode === "login" && (
            <p className="text-center text-xs text-gray-500 mt-4">
              {BN ? "একাউন্ট নেই? " : "No account? "}
              <button onClick={() => setMode("register")} className="text-blue-400 hover:underline">
                {BN ? "রেজিস্ট্রেশন করুন" : "Register here"}
              </button>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          {BN
            ? "আপনার তথ্য নিরাপদ এবং এনক্রিপ্টেড।"
            : "Your data is secure and encrypted."}
        </p>
      </div>
    </div>
  );
}
