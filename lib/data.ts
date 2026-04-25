import { AgeGroup, PresetQuery } from "./types";

export const AGE_GROUPS: Record<AgeGroup, { label: string; min: number; max: number }> = {
  infant: { label: "Infant (0–2)", min: 0, max: 2 },
  child:  { label: "Child (3–12)", min: 3, max: 12 },
  teen:   { label: "Teen (13–17)", min: 13, max: 17 },
  adult:  { label: "Adult (18–59)", min: 18, max: 59 },
  senior: { label: "Senior (60+)", min: 60, max: 120 },
};

export const AVATARS: Record<AgeGroup, string> = {
  infant: "👶", child: "🧒", teen: "🧑", adult: "🧑", senior: "👴",
};

export const AVATAR_BG: Record<AgeGroup, string> = {
  infant: "#2a1f00", child: "#0a2a0a", teen: "#0a1a2a", adult: "#0a1a2a", senior: "#2a1f00",
};

export const AVATAR_TC: Record<AgeGroup, string> = {
  infant: "#f59e0b", child: "#22c55e", teen: "#3b82f6", adult: "#3b82f6", senior: "#f59e0b",
};

export function getAgeGroup(age: string | number): AgeGroup {
  const a = parseInt(String(age)) || 0;
  if (a <= 2) return "infant";
  if (a <= 12) return "child";
  if (a <= 17) return "teen";
  if (a <= 59) return "adult";
  return "senior";
}

export const PRESETS_BY_GROUP: Record<AgeGroup, PresetQuery[]> = {
  infant: [
    { id: "causes", emoji: "🔍", label: "Causes & Diagnosis",
      query: "PhD-level research on UTI causes and diagnosis in infants/toddlers. Include vesicoureteral reflux (VUR), structural abnormalities, hygiene factors, uncircumcised males, breastfeeding protection, diagnostic challenges in pre-verbal children, urine collection methods, DMSA scan indications, voiding cystourethrogram (VCUG) guidelines. What do pediatric urologists recommend and what do parents in forums find?" },
    { id: "treatment", emoji: "💊", label: "Safe Treatment Options",
      query: "Evidence-based UTI treatment for infants — antibiotics safe in infancy (amoxicillin-clavulanate, cefixime, trimethoprim), prophylaxis indications (with VUR grades), duration of treatment, IV vs oral, signs requiring hospitalization. Natural approaches safe for infants. Parents' experiences online." },
    { id: "prevention", emoji: "🛡️", label: "Prevention Strategies",
      query: "UTI prevention in infants and toddlers — diaper hygiene, wiping technique, avoiding bubble baths, breastfeeding benefits, probiotics safe for infants (strains, doses), vitamin C in diet, hydration for toddlers, cranberry safety in young children, constipation and UTI link, and what real parents find works." },
    { id: "diet", emoji: "🥛", label: "Diet & Hydration",
      query: "Optimal diet and hydration for UTI prevention in toddlers — daily fluid intake for age, best fluids, foods that irritate bladder, probiotic foods safe for toddlers, vitamin C foods vs supplements, avoiding bladder irritants in small children, feeding strategies, and parent community insights." },
  ],
  child: [
    { id: "causes", emoji: "🔍", label: "Causes & Risk Factors",
      query: "Comprehensive research on UTI causes in school-age children (3–12). Include: anatomical factors, hygiene habits, wiping front-to-back, bubble baths and soaps, constipation-UTI connection, holding urine at school, dysfunctional voiding, VUR, pinworm connection, swimming pools, tight clothing. What pediatricians recommend and parent forum experiences. Age-specific research." },
    { id: "natural", emoji: "🌿", label: "Natural Prevention",
      query: "All natural UTI prevention approaches safe for children aged 3–12 — D-mannose (is it safe for children? dosing by weight), cranberry juice vs extract (safe age, dose), probiotics (child-safe strains and doses — L. rhamnosus GG, L. acidophilus), vitamin C, hibiscus tea safety in children, honey and lemon, Ayurvedic approaches for children, what parents on Reddit and forums swear by for their daughters." },
    { id: "hygiene", emoji: "🧴", label: "Hygiene & Lifestyle",
      query: "Detailed hygiene and lifestyle protocol for UTI prevention in young girls aged 3–12 — correct front-to-back wiping technique, appropriate soaps, bath vs shower, swimwear hygiene, cotton underwear, school bathroom habits, encouraging regular voiding, constipation management, adequate water intake strategies for children who resist drinking, and tips from real parents managing recurrent UTIs." },
    { id: "diet", emoji: "🥗", label: "Diet & Fluids",
      query: "Complete dietary protocol for UTI prevention in a young child — daily fluid intake recommendations, best fluids, bladder irritating foods to avoid, probiotic-rich foods safe for children, fiber for constipation prevention, vitamin C food sources, practical strategies to get children to drink more water, and what works according to parent communities." },
    { id: "doctor", emoji: "🏥", label: "When to See a Doctor",
      query: "Complete guide on medical evaluation for recurrent UTI in young children — when to worry about kidney involvement (pyelonephritis signs), VCUG and DMSA scan indications, VUR grading and management, antibiotic prophylaxis evidence in children, urine culture interpretation, specialist referral triggers, and long-term follow-up." },
    { id: "community", emoji: "👥", label: "Parent Experiences",
      query: "What do parents actually experience managing recurrent UTI in their young daughters (3–6 years old)? Synthesize from Reddit (r/Parenting, r/beyondthebump, r/Mommit), parenting forums, pediatric nursing communities. Unconventional tips that worked, mistakes to avoid, how to discuss hygiene with young children, and cultural approaches from South Asian and East Asian parenting communities." },
  ],
  teen: [
    { id: "causes", emoji: "🔍", label: "Causes & Risk Factors",
      query: "UTI causes and risk factors in adolescent females — hormonal changes, hygiene products (tampons, pads), contraceptive-related UTI risks, dietary factors, dehydration, holding urine, constipation, dysfunctional voiding. Evidence-based research plus teen health community insights." },
    { id: "natural", emoji: "🌿", label: "Natural Remedies",
      query: "Natural UTI prevention and treatment for teenagers — D-mannose (dose for teens), cranberry PAC extract, probiotics (strains and doses for teens), uva ursi safety in teens, vitamin C protocol, adequate hydration strategies, dietary changes. Evidence levels and teen/young adult forum experiences." },
    { id: "prevention", emoji: "🛡️", label: "Lifestyle Prevention",
      query: "Complete lifestyle and hygiene protocol for UTI prevention in teenage girls — hygiene during menstruation, appropriate cleansers, clothing choices, voiding habits, hydration, constipation management, school and sports hygiene strategies, and community insights from teen health forums." },
    { id: "community", emoji: "👥", label: "Community Insights",
      query: "Real experiences from teens and young women managing recurrent UTI — what works beyond standard advice, emotional aspects of recurrent UTI in adolescents, practical tips for school settings, and hidden strategies from health forums and communities." },
  ],
  adult: [
    { id: "full", emoji: "🦠", label: "Complete UTI Protocol",
      query: "PhD-level comprehensive UTI prevention and management research for adults. All interventions: medical, natural (D-mannose, cranberry PAC, probiotics with strains/doses), dietary, lifestyle. Evidence-based plus community insights from Reddit and health forums. Specific dosages and protocols." },
    { id: "natural", emoji: "🌿", label: "Natural Remedies",
      query: "All evidence-based natural remedies for adult UTI prevention and treatment — D-mannose, cranberry extract, uva ursi, probiotics, hibiscus, horsetail, vitamin C, Ayurvedic formulations, TCM herbs. Clinical evidence levels, specific doses, drug interactions. Forum and community experiences." },
    { id: "diet", emoji: "🥗", label: "Diet & Lifestyle",
      query: "Complete diet and lifestyle protocol for UTI prevention in adults — hydration targets, bladder-irritating foods, probiotic foods, urine pH management, hygiene practices, constipation management, community experiences." },
    { id: "medical", emoji: "💊", label: "Medical Options",
      query: "Medical management options for recurrent adult UTI — antibiotic choices, prophylaxis options (post-coital, daily low-dose), non-antibiotic prophylaxis (methenamine hippurate), topical estrogen for postmenopausal women, immunostimulation (OM-89), specialist referral indicators." },
    { id: "community", emoji: "👥", label: "Community Insights",
      query: "Real adult experiences managing recurrent UTI — Reddit, health forums, women's health communities. What works beyond standard advice, hidden tips, lifestyle modifications that made the biggest difference." },
  ],
  senior: [
    { id: "full", emoji: "🦠", label: "Complete UTI Protocol",
      query: "PhD-level research on recurrent UTI management in elderly patients (60+). All interventions: catheterization strategies, medications with geriatric dosing, natural remedies safe for elderly, dietary protocol, caregiving practices. Include atypical UTI presentation in elderly, antibiotic stewardship, and caregiver community experiences." },
    { id: "neurogenic", emoji: "🧠", label: "Neurogenic Bladder",
      query: "Deep research on neurogenic bladder management in elderly stroke/neurological patients — incomplete emptying, urinary retention, CIC technique for caregivers, catheter types, bladder training, medications (bethanechol, tamsulosin, oxybutynin in elderly), post-void residual management, and what caregivers find actually works." },
    { id: "natural", emoji: "🌿", label: "Natural & Integrative Remedies",
      query: "All natural UTI remedies safe for elderly patients — D-mannose dose for elderly, cranberry PAC, probiotics (strains safe with common elderly medications), uva ursi safety in elderly, vitamin C at elderly doses, Ayurvedic formulations, TCM herbs. Drug interactions with anticoagulants, antihypertensives, statins. Community caregiver experiences." },
    { id: "catheter", emoji: "🏥", label: "Catheterization & Hygiene",
      query: "Complete catheterization and hygiene protocols for bedridden elderly patients with neurogenic bladder — CIC caregiver guide, catheter types, CAUTI prevention, bladder irrigation, catheter care, what experienced caregivers in nursing and caregiving communities find most effective for reducing infection rates." },
    { id: "diet", emoji: "🥗", label: "Diet & Nutrition",
      query: "Complete dietary protocol for UTI prevention in bedridden elderly patient — daily fluid targets for elderly, best vs worst fluids, urine pH management, vitamin C protocol, probiotics through food, fiber for constipation (key factor), tube feeding considerations, and practical strategies for caregivers." },
    { id: "antibiotics", emoji: "💊", label: "Antibiotic Strategy",
      query: "Antibiotic stewardship for elderly UTI — when to treat vs asymptomatic bacteriuria, appropriate antibiotics with geriatric renal dosing, prophylaxis options (nitrofurantoin risk in elderly, trimethoprim, methenamine), resistance prevention, urosepsis warning signs, EAU/AUA/CDC CAUTI guidelines." },
    { id: "community", emoji: "👥", label: "Caregiver Community Insights",
      query: "Real caregiver experiences managing recurrent UTI in elderly bedridden patients — Reddit caregiving communities, nursing forums, long-term care staff insights, cultural caregiver approaches. Unconventional strategies that work, mistakes to avoid, long-term caregiving sustainability tips." },
  ],
};

export const DEFAULT_PROFILES = [
  {
    id: 1, name: "Father", age: "74", gender: "Male", relationship: "Father",
    conditions: "Severe Ischemic Stroke (4 years ago), left-sided complete hemiplegia, neurogenic bladder, urinary retention, recurrent UTI",
    history: "Decompressive craniectomy (bone flap removal); subsequent cranioplasty. Fully bedridden for 4 years.",
    bladder: "Neurogenic bladder — zero voluntary control, no sensory awareness of bladder fullness, significant urinary retention with post-void residual urine",
    currentIssue: "Recurrent UTI, high pus cells (pyuria) in urine, incomplete bladder emptying",
    meds: "", labs: "Urine R/E: High pus cells (pyuria), recurrent bacterial growth on culture",
    allergies: "", notes: "4 years in this condition. Main concern is persistent UTI from neurogenic bladder causing urine retention and infection.",
  },
  {
    id: 2, name: "Daughter", age: "4", gender: "Female", relationship: "Daughter",
    conditions: "Recurrent UTI episodes",
    history: "No major surgical history. Otherwise healthy child.",
    bladder: "Normal voluntary bladder control, normal sensation. UTI episodes are intermittent.",
    currentIssue: "Recurrent UTI episodes — possible contributing factors include hygiene, diet, or anatomical susceptibility",
    meds: "", labs: "Urine R/E: Pus cells during UTI episodes",
    allergies: "", notes: "4-year-old girl with occasional UTI. Need to investigate root causes and prevention strategies safe for young children.",
  },
];
