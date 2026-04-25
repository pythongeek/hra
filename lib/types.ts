export interface PatientProfile {
  id: number;
  name: string;
  age: string;
  gender: string;
  relationship: string;
  conditions: string;
  history: string;
  bladder: string;
  currentIssue: string;
  meds: string;
  labs: string;
  allergies: string;
  notes: string;
}

export interface ResearchResult {
  id: number;
  query: string;
  text: string;
  ts: string;
  model: string;
  patientId: number;
}

export type ModelType = "anthropic" | "minimax" | "hermes";

export type AgeGroup = "infant" | "child" | "teen" | "adult" | "senior";

export interface PresetQuery {
  id: string;
  emoji: string;
  label: string;
  query: string;
}
