import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Support multiple env var naming conventions (Next.js, Vite, bare)
function getEnv(keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

const supabaseUrl = getEnv([
  "NEXT_PUBLIC_SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "SUPABASE_URL",
]);

const supabaseAnonKey = getEnv([
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
]);

const supabaseServiceKey = getEnv([
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
]);

// Lazy singletons — only created when first used, never at module load time
let _client: SupabaseClient | null = null;
let _admin: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your Vercel environment variables."
    );
  }
  if (!_client) _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

export function getSupabaseAdmin(): SupabaseClient {
  const key = supabaseServiceKey || supabaseAnonKey;
  if (!supabaseUrl || !key) {
    throw new Error("Supabase admin not configured.");
  }
  if (!_admin) _admin = createClient(supabaseUrl, key);
  return _admin;
}

// Named exports for backward compat — lazily resolved
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export interface Document {
  id: string;
  user_id: string | null;
  session_id: string | null;
  profile_id: number;
  profile_name: string;
  file_name: string;
  file_path: string;
  file_url: string;
  file_type: "image" | "pdf";
  category: "report" | "prescription" | "other";
  report_date: string | null;
  ai_summary: string | null;
  ai_values: Record<string, unknown> | null;
  created_at: string;
}
