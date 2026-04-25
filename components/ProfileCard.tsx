"use client";
import { PatientProfile } from "@/lib/types";
import { getAgeGroup, AGE_GROUPS, AVATARS, AVATAR_BG, AVATAR_TC } from "@/lib/data";
import { Lang, t } from "@/lib/i18n";

interface Props {
  profile: PatientProfile;
  isActive: boolean;
  resultCount: number;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  canDelete: boolean;
  lang?: Lang;
}

export default function ProfileCard({ profile, isActive, resultCount, onSelect, onEdit, onDelete, canDelete, lang = "bn" }: Props) {
  const tx = t(lang);
  const ag = getAgeGroup(profile.age);
  return (
    <div className={`rounded-xl border p-4 transition-all ${isActive ? "border-blue-500/60 bg-blue-500/5" : "border-white/10 bg-white/3"}`}>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: AVATAR_BG[ag], color: AVATAR_TC[ag] }}>
          {AVATARS[ag]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-white">{profile.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-400">{profile.age}y · {profile.gender}</span>
            {profile.relationship && <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-500">{profile.relationship}</span>}
            {isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Active</span>}
          </div>
          <p className="text-xs text-gray-500 mt-1 truncate">{profile.conditions || tx.profiles.noConditions}</p>
          <p className="text-xs text-gray-600 mt-0.5">{(tx.ageGroups as Record<string,string>)[ag]} · {tx.profiles.sessions(resultCount)}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!isActive && (
            <button onClick={onSelect}
              className="px-3 py-1.5 rounded-lg bg-white text-black text-xs font-medium hover:bg-gray-200 transition-colors">
              Select
            </button>
          )}
          <button onClick={onEdit}
            className="px-3 py-1.5 rounded-lg border border-white/20 text-gray-400 text-xs hover:bg-white/10 transition-colors">
            Edit
          </button>
          {canDelete && (
            <button onClick={onDelete}
              className="px-2 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-xs hover:bg-red-500/10 transition-colors">
              ✕
            </button>
          )}
        </div>
      </div>
      {isActive && (
        <div className="mt-3 pt-3 border-t border-blue-500/20 text-xs text-blue-400">
          {tx.profiles.activeNote}
        </div>
      )}
    </div>
  );
}
