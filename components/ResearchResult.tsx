"use client";
import { useState } from "react";

const SECTION_DEFS = [
  { key: "🔬", label: "Clinical Evidence", color: "#3b82f6" },
  { key: "💊", label: "Medical Interventions", color: "#3b82f6" },
  { key: "🌿", label: "Natural & Integrative Remedies", color: "#22c55e" },
  { key: "🥗", label: "Dietary & Nutritional Protocol", color: "#22c55e" },
  { key: "🏥", label: "Caregiving & Daily Protocols", color: "#f59e0b" },
  { key: "👥", label: "Community Insights", color: "#22c55e" },
  { key: "⚠️", label: "Safety Critical Notes", color: "#ef4444" },
  { key: "📋", label: "Personalized Action Plan", color: "#3b82f6" },
];

function parseSections(text: string) {
  const lines = text.split("\n");
  const sections: { key: string; label: string; color: string; lines: string[] }[] = [];
  let cur: typeof sections[0] | null = null;
  for (const line of lines) {
    const def = SECTION_DEFS.find((d) => line.startsWith(d.key));
    if (def) {
      if (cur) sections.push(cur);
      cur = { ...def, lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    } else if (line.trim()) {
      if (!sections.length) sections.push({ key: "", label: "Overview", color: "#3b82f6", lines: [line] });
      else sections[sections.length - 1].lines.push(line);
    }
  }
  if (cur) sections.push(cur);
  return sections;
}

function RenderLine({ line }: { line: string }) {
  if (!line.trim()) return <div className="h-1" />;
  const isBullet = line.startsWith("- ") || line.startsWith("• ") || line.startsWith("* ");
  const isNum = /^\d+\./.test(line);
  let content = isBullet ? line.slice(2) : isNum ? line.replace(/^\d+\.\s*/, "") : line;
  const numVal = isNum ? line.match(/^(\d+)/)?.[1] : null;
  // Bold and code
  const parts = content.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  const rendered = parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} className="text-white font-medium">{p.slice(2, -2)}</strong>;
    if (p.startsWith("`") && p.endsWith("`")) return <code key={i} className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded">{p.slice(1, -1)}</code>;
    return p;
  });

  if (isBullet) return (
    <div className="flex gap-2 py-0.5 items-start">
      <span className="text-blue-400 text-xs mt-1.5 flex-shrink-0">▸</span>
      <span className="text-sm leading-relaxed text-gray-300">{rendered}</span>
    </div>
  );
  if (isNum) return (
    <div className="flex gap-2 py-0.5 items-start">
      <span className="text-blue-400 text-xs font-mono flex-shrink-0 min-w-5 mt-0.5">{numVal}.</span>
      <span className="text-sm leading-relaxed text-gray-300">{rendered}</span>
    </div>
  );
  return <p className="text-sm leading-relaxed text-gray-300 my-0.5">{rendered}</p>;
}

interface Props {
  text: string;
}

export default function ResearchResult({ text }: Props) {
  const sections = parseSections(text);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const isExpanded = (i: number) => expanded[i] !== false;
  const toggle = (i: number) => setExpanded((prev) => ({ ...prev, [i]: !isExpanded(i) }));

  return (
    <div className="space-y-2">
      {sections.map((sec, i) => (
        <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
          <button onClick={() => toggle(i)}
            className="w-full flex justify-between items-center px-4 py-3 bg-white/3 hover:bg-white/5 transition-colors text-left">
            <span className="text-sm font-medium" style={{ color: sec.color }}>
              {sec.key} {sec.label}
            </span>
            <span className="text-xs text-gray-600">{isExpanded(i) ? "▼" : "▶"}</span>
          </button>
          {isExpanded(i) && sec.lines.filter(Boolean).length > 0 && (
            <div className="px-4 py-3 border-t border-white/5">
              {sec.lines.map((l, j) => <RenderLine key={j} line={l} />)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
