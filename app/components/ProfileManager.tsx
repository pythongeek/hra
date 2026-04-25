'use client'
import { PatientProfile, getAgeGroup, AGE_GROUPS, AVATARS } from '../lib/types'
import styles from './ProfileManager.module.css'

const AVATAR_COLORS: Record<string, string> = {
  infant: '#451a03', child: '#14532d', teen: '#1e3a5f', adult: '#1e3a5f', senior: '#451a03',
}
const AVATAR_TEXT: Record<string, string> = {
  infant: '#f59e0b', child: '#22c55e', teen: '#3b82f6', adult: '#3b82f6', senior: '#f59e0b',
}

const EMPTY_PROFILE: Omit<PatientProfile, 'id'> = {
  name: '', age: '', gender: 'Female', relationship: '', conditions: '',
  history: '', bladder: 'Normal voluntary control', currentIssue: '',
  meds: '', labs: '', allergies: '', notes: '',
}

interface Props {
  profiles: PatientProfile[]
  activeId: number
  onSelect: (id: number) => void
  onAdd: (p: PatientProfile) => void
  onUpdate: (p: PatientProfile) => void
  onDelete: (id: number) => void
}

import { useState } from 'react'

export default function ProfileManager({ profiles, activeId, onSelect, onAdd, onUpdate, onDelete }: Props) {
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list')
  const [formData, setFormData] = useState<Omit<PatientProfile, 'id'>>(EMPTY_PROFILE)
  const [editId, setEditId] = useState<number | null>(null)

  function startAdd() { setFormData(EMPTY_PROFILE); setView('add') }
  function startEdit(p: PatientProfile) {
    const { id, ...rest } = p; setEditId(id); setFormData(rest); setView('edit')
  }
  function cancel() { setView('list'); setEditId(null) }

  function saveAdd() {
    if (!formData.name || !formData.age) return alert('Name and age are required')
    onAdd({ ...formData, id: Date.now() })
    setView('list')
  }
  function saveEdit() {
    if (editId === null) return
    onUpdate({ ...formData, id: editId })
    setView('list'); setEditId(null)
  }

  function set(k: keyof typeof EMPTY_PROFILE, v: string) {
    setFormData(prev => ({ ...prev, [k]: v }))
  }

  if (view === 'add' || view === 'edit') {
    return (
      <div className={styles.formWrap}>
        <div className={styles.formHeader}>
          <span>{view === 'add' ? 'Add New Profile' : 'Edit Profile'}</span>
          <button className={styles.cancelBtn} onClick={cancel}>Cancel</button>
        </div>
        <div className={styles.formGrid}>
          {([
            ['name','Name','text','e.g. Father, Daughter, Mom'],
            ['relationship','Relationship','text','e.g. Father, Daughter, Self'],
            ['age','Age (years)','text','e.g. 74, 4, 35'],
            ['gender','Gender','text','Male / Female / Other'],
          ] as [keyof typeof EMPTY_PROFILE, string, string, string][]).map(([k, label, type, ph]) => (
            <div key={k}>
              <div className={styles.label}>{label}</div>
              <input className={styles.input} type={type} value={formData[k]} onChange={e => set(k, e.target.value)} placeholder={ph} />
            </div>
          ))}
        </div>
        {([
          ['conditions','Medical Conditions','e.g. Stroke, UTI, Diabetes...'],
          ['history','Medical / Surgical History','Past surgeries, hospitalisations...'],
          ['bladder','Bladder Status','e.g. Normal, Neurogenic bladder, Retention...'],
          ['currentIssue','Current Health Issue','What problem needs researching...'],
          ['meds','Current Medications','List all medications and doses...'],
          ['labs','Recent Lab Results','Urine R/E, culture results, blood tests...'],
          ['allergies','Allergies','None known'],
          ['notes','Additional Notes','Anything else relevant...'],
        ] as [keyof typeof EMPTY_PROFILE, string, string][]).map(([k, label, ph]) => (
          <div key={k} style={{ marginTop: 10 }}>
            <div className={styles.label}>{label}</div>
            <textarea className={styles.textarea} value={formData[k]} onChange={e => set(k, e.target.value)} placeholder={ph} rows={2} />
          </div>
        ))}
        <div className={styles.formActions}>
          <button className={styles.primaryBtn} onClick={view === 'add' ? saveAdd : saveEdit}>
            {view === 'add' ? 'Create Profile' : 'Save Changes'}
          </button>
          <button className={styles.cancelBtn} onClick={cancel}>Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.listHeader}>
        <span className={styles.countLabel}>{profiles.length} patient profile{profiles.length !== 1 ? 's' : ''}</span>
        <button className={styles.primaryBtn} onClick={startAdd}>+ Add Profile</button>
      </div>
      <div className={styles.list}>
        {profiles.map(p => {
          const ag = getAgeGroup(p.age)
          const isActive = p.id === activeId
          const avatarStyle = { background: AVATAR_COLORS[ag], color: AVATAR_TEXT[ag] }
          return (
            <div key={p.id} className={`${styles.profileCard} ${isActive ? styles.activeCard : ''}`}>
              <div className={styles.cardRow}>
                <div className={styles.avatar} style={avatarStyle}>{AVATARS[ag]}</div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardNameRow}>
                    <span className={styles.cardName}>{p.name}</span>
                    <span className={styles.badge}>{p.age}y · {p.gender}</span>
                    {p.relationship && <span className={styles.badge2}>{p.relationship}</span>}
                    {isActive && <span className={styles.activeBadge}>Active</span>}
                  </div>
                  <div className={styles.cardConditions}>{p.conditions || 'No conditions listed'}</div>
                  <div className={styles.cardMeta}>{AGE_GROUPS[ag]?.label}</div>
                </div>
                <div className={styles.cardActions}>
                  {!isActive && <button className={styles.primaryBtn} style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => onSelect(p.id)}>Select</button>}
                  <button className={styles.secondaryBtn} onClick={() => startEdit(p)}>Edit</button>
                  {profiles.length > 1 && <button className={styles.dangerBtn} onClick={() => onDelete(p.id)}>×</button>}
                </div>
              </div>
              {isActive && (
                <div className={styles.activeNote}>
                  Active profile — all research is personalised for this patient.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
