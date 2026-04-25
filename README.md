# 🔬 Health Research Agent v2

An advanced AI-powered health research and caregiving assistant. Supports multiple patient profiles, document uploads, report trend analysis, bilingual AI assistant, and voice interaction.

## ✨ What's New in v2

- **📎 Document Manager** — Upload reports & prescriptions (image/PDF) per patient, AI extracts all medical values
- **📊 Report Trend Analysis** — Compare reports over time, AI identifies what's improving vs worsening and why
- **🇧🇩 Bangla-first** — Full Bengali UI by default, switch to English anytime. AI responds in selected language
- **🤖 AI Assistant** — Conversational assistant aware of patient profile + uploaded documents, suggests follow-up research
- **🗄️ Supabase Storage** — Documents stored in Supabase, analyses cached in database, persists across sessions

## 🚀 Deploy to Vercel

### 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run the contents of `supabase/schema.sql`
3. Go to **Storage** → create a bucket named `health-documents`, make it **Public**
4. Copy your project URL and API keys from **Settings → API**

### 2. Push to GitHub & Import to Vercel

```bash
git remote add origin https://github.com/YOUR_USERNAME/hra.git
git push -u origin main
```

Then import at [vercel.com](https://vercel.com) → New Project → Import from GitHub.

### 3. Required Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | From [console.anthropic.com](https://console.anthropic.com) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (for server-side uploads) |
| `MINIMAX_API_KEY` | Optional | For MiniMax M2.7 model |
| `OPENROUTER_API_KEY` | Optional | For Hermes model via OpenRouter |

## 🛠️ Local Development

```bash
npm install
cp .env.local.example .env.local
# Fill in your API keys in .env.local
npm run dev
```

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── research/       # Claude deep research
│   │   ├── voice/          # Voice AI (short conversational)
│   │   ├── assistant/      # AI assistant with document context
│   │   ├── upload/         # File upload to Supabase Storage
│   │   ├── documents/      # Fetch/delete documents
│   │   ├── analyze-documents/ # AI reads & extracts report values
│   │   ├── compare-reports/   # Trend analysis across reports
│   │   ├── minimax/        # MiniMax proxy
│   │   └── hermes/         # OpenRouter/Hermes proxy
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx            # Main app (7 tabs)
├── components/
│   ├── DocumentManager.tsx # Upload, categorize, analyze docs
│   ├── AIAssistant.tsx     # Conversational AI with doc context
│   ├── VoiceAssistant.tsx  # Voice input/output, BN+EN
│   ├── ProfileCard.tsx     # Patient card with translations
│   ├── ProfileForm.tsx     # Add/edit patient form
│   └── ResearchResult.tsx  # Research output renderer
├── lib/
│   ├── i18n.ts             # Full BN/EN translations
│   ├── supabase.ts         # Supabase client + types
│   ├── types.ts            # TypeScript interfaces
│   ├── data.ts             # Age groups, presets, defaults
│   └── prompts.ts          # AI system prompt builder
├── supabase/
│   └── schema.sql          # Database schema to run in Supabase
└── types/
    └── speech.d.ts         # Web Speech API type declarations
```

## 🌟 Key Features

### Document Intelligence
- Upload images and PDFs of lab reports, prescriptions, X-rays
- AI automatically extracts all numeric values (pus cells, WBC, creatinine, etc.)
- Compare reports across dates — AI explains trends, causes, and action plans

### Bilingual by Default
- Interface starts in **বাংলা** — designed for Bengali-speaking caregivers
- One-click switch to English
- AI assistant and voice assistant both respond in the selected language

### AI Assistant
- Knows the patient's full profile + all uploaded analyzed documents
- Suggests follow-up questions after every answer
- 6 quick-action buttons for common caregiving questions
- Bridges to deep research when needed

### Voice Assistant  
- Free browser-based speech recognition (Chrome/Edge/Safari)
- Bengali (bn-BD) and English (en-US) voice input/output
- Animated waveform, pulsing mic, real-time transcript preview

## ⚠️ Medical Disclaimer

For research and informational purposes only. Always consult qualified healthcare professionals before implementing any medical advice.
