"use client";
import { PatientProfile } from "@/lib/types";

interface Props {
  profile: Partial<PatientProfile>;
  onChange: (key: keyof PatientProfile, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  isEdit: boolean;
}

const FIELDS: { key: keyof PatientProfile; label: string; placeholder: string; textarea?: boolean }[] = [
  { key: "name", label: "Full Name", placeholder: "e.g. Father, Daughter, Self" },
  { key: "age", label: "Age (years)", placeholder: "e.g. 74, 4, 35" },
  { key: "gender", label: "Gender", placeholder: "Male / Female / Other" },
  { key: "relationship", label: "Relationship", placeholder: "e.g. Father, Daughter, Self" },
  { key: "conditions", label: "Medical Conditions", placeholder: "e.g. Stroke, UTI, Diabetes...", textarea: true },
  { key: "history", label: "Medical / Surgical History", placeholder: "Past surgeries, hospitalizations...", textarea: true },
  { key: "bladder", label: "Bladder Status", placeholder: "e.g. Normal, Neurogenic, Retention...", textarea: true },
  { key: "currentIssue", label: "Current Health Issue", placeholder: "What problem needs research?", textarea: true },
  { key: "meds", label: "Current Medications", placeholder: "List all medications and doses...", textarea: true },
  { key: "labs", label: "Recent Lab Results", placeholder: "Urine R/E, culture, blood tests...", textarea: true },
  { key: "allergies", label: "Known Allergies", placeholder: "None known" },
  { key: "notes", label: "Additional Notes", placeholder: "Anything else relevant...", textarea: true },
];

export default function ProfileForm({ profile, onChange, onSave, onCancel, isEdit }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-white">{isEdit ? "Edit Profile" : "Add New Profile"}</h2>
        <button onClick={onCancel} className="text-xs text-gray-400 border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className={f.textarea ? "sm:col-span-2" : ""}>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">{f.label}</label>
            {f.textarea ? (
              <textarea
                rows={2}
                value={(profile[f.key] as string) || ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30 resize-y"
              />
            ) : (
              <input
                type="text"
                value={(profile[f.key] as string) || ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30"
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-5">
        <button onClick={onSave}
          className="px-5 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
          {isEdit ? "Save Changes" : "Create Profile"}
        </button>
        <button onClick={onCancel}
          className="px-5 py-2 border border-white/20 text-gray-400 rounded-lg text-sm hover:bg-white/10 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
