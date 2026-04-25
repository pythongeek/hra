'use client'
import { ResearchResult, SECTION_DEFS } from '../lib/types'
import { useState } from 'react'
import styles from './ResultsView.module.css'

interface ParsedSection { key: string; label: string; color: string; lines: string[] }

function parseSections(text: string): ParsedSection[] {
  const lines = text.split('\n')
  const sections: ParsedSection[] = []
  let cur: ParsedSection | null = null
  for (const line of lines) {
    const def = SECTION_DEFS.find(d => line.startsWith(d.key))
    if (def) {
      if (cur) sections.push(cur)
      cur = { ...def, lines: [] }
    } else if (cur) {
      cur.lines.push(line)
    } else if (line.trim()) {
      if (!sections.length) sections.push({ key: '', label: 'Overview', color: 'blue', lines: [line] })
      else sections[sections.length - 1].lines.push(line)
    }
  }
  if (cur) sections.push(cur)
  return sections
}

function renderLine(line: string): string {
  if (!line.trim()) return '<div style="height:5px"></div>'
  const isB = line.startsWith('- ') || line.startsWith('• ') || line.startsWith('* ')
  const isN = /^\d+\./.test(line)
  let c = isB ? line.slice(2) : isN ? line.replace(/^\d+\.\s*/, '') : line
  const num = isN ? (line.match(/^(\d+)/) || [])[1] : null
  c = c.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  c = c.replace(/`([^`]+)`/g, `<code>$1</code>`)
  if (isB) return `<div class="bullet"><span class="arrow">▸</span><span>${c}</span></div>`
  if (isN) return `<div class="bullet"><span class="num">${num}.</span><span>${c}</span></div>`
  return `<p>${c}</p>`
}

function Section({ sec, idx }: { sec: ParsedSection; idx: number }) {
  const [open, setOpen] = useState(true)
  const html = sec.lines.map(renderLine).join('')
  const colorMap: Record<string, string> = {
    blue: styles.blue, green: styles.green, yellow: styles.yellow, red: styles.red,
  }
  return (
    <div className={styles.section}>
      <button className={`${styles.sectionHeader} ${colorMap[sec.color]}`} onClick={() => setOpen(!open)}>
        <span>{sec.key} {sec.label}</span>
        <span className={styles.chevron}>{open ? '▼' : '▶'}</span>
      </button>
      {open && (
        <div
          className={styles.sectionBody}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  )
}

interface Props {
  result: ResearchResult
  history: ResearchResult[]
  patientName: string
  onSelectHistory: (r: ResearchResult) => void
  onBack: () => void
}

export default function ResultsView({ result, history, patientName, onSelectHistory, onBack }: Props) {
  const sections = parseSections(result.text)
  return (
    <div>
      <div className={styles.meta}>
        <div className={styles.metaLeft}>
          <span className={styles.metaTime}>{result.ts} · {patientName} · {result.model}</span>
          <span className={styles.metaQuery}>{result.query.substring(0, 110)}…</span>
        </div>
        <button className={styles.backBtn} onClick={onBack}>← Research</button>
      </div>

      {sections.map((sec, i) => <Section key={i} sec={sec} idx={i} />)}

      {history.length > 0 && (
        <div className={styles.historySection}>
          <div className={styles.historyLabel}>Previous sessions for {patientName}</div>
          {history.map(r => (
            <button key={r.id} className={styles.historyItem} onClick={() => onSelectHistory(r)}>
              <div className={styles.historyTime}>{r.ts}</div>
              <div className={styles.historyQuery}>{r.query.substring(0, 100)}…</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
