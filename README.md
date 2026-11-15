# AI-Powered Smart Water Management and Farmer Support System

A practical, trilingual (**Telugu / తెలుగు [Default], English, and Hindi / हिन्दी**) agricultural water-management and decision-support web application designed for rural farmers and first-time smartphone users.

---

## Project Overview

This application guides farmers through authentication and personalized farm profile setup before opening a tailored dashboard with six practical agricultural tools, an inline AI Voice Assistant, and trilingual voice read-aloud support.

### Complete User Flow

1. **Login / Registration / Forgot Password (`AuthPage`)**:
   - First screen shown to unauthenticated visitors; protected dashboard and feature pages cannot be accessed while logged out.
   - Supports mobile number + password login (with show/hide toggle), new farmer registration (full name, mobile number, password, confirm password, preferred language), and demo password reset.
   - Passwords are never stored in plain text (`crypto.scryptSync` with per-user 16-byte random salts + `HttpOnly` HMAC-signed session cookies).
   - **Development / Demo Authentication Mode**: Clearly labelled when Firebase Authentication is not configured (`firebase-applet-config.json` absent).
2. **Required Farmer Profile Setup (`ProfileSetupPage`)**:
   - Shown immediately after first registration or whenever a farmer's profile is incomplete.
   - Collects Personal Details (name, mobile, village, mandal, district, state defaulting to Andhra Pradesh), Farm Details (cultivated land, unit, main crop, other crops, growth stage, soil type), and Water Details (main water source, irrigation method, water availability).
   - Returning farmers with completed profiles go straight to the personalized Dashboard and can edit their details anytime.
3. **Personalized Farmer Dashboard (`HomePage`)**:
   - Personalized greeting, compact farm summary card with *Edit Profile* and *Recent Activity* actions, an inline **Quick AI Voice Assistant**, and six core feature cards:
     - **Soil Analysis**: Photo upload + AI preliminary moisture/drainage analysis (`GEMINI_API_KEY`).
     - **Smart Irrigation Planner**: Prefilled from saved farm profile; calculates cycle volume, frequency, timing, and water-saving tips.
     - **Water Budget Planner**: Prefilled from saved crop/area/method; computes possible cycles, duration, and target-day shortage/surplus.
     - **Weather Monitoring**: Prefilled village/mandal/district lookup + GPS + OpenWeatherMap integration (`WEATHER_API_KEY`) or clearly labelled Sample Demonstration screen.
     - **Disaster Preparedness Assistant**: Trilingual Before/During/After checklists for Cyclone, Flood, and Drought with farm context.
     - **Farmer FAQ Assistant**: Trilingual Gemini conversational advisor contextualized with the farmer's crop, location, soil, and water profile.

---

## Language & Voice Support

- **Trilingual UI & AI Responses**: Default **తెలుగు (Telugu)** for new users, switchable across **తెలుగు**, **English**, and **हिन्दी** from the header/login screen and persisted across refreshes and logins.
- **Voice Input & Read-Aloud**: Browser Web Speech API (`te-IN`, `en-IN`, `hi-IN`) with explicit status states (*Ready*, *Listening*, *Processing*, *Permission denied*, *Unsupported*, *Error*), editable transcript before submitting, safe JSON error handling, and TTS playback with voice-availability notice.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js, Express (`server.ts`), `tsx` in development
- **AI SDK**: `@google/genai` (server-side only, using `gemini-4-hydrogen`)
- **Demo Auth Persistence**: `server/services/authService.ts` (`scrypt` password hashing + HMAC-signed `HttpOnly` cookies + `server/data/farmers-store.json` gitignored)

---

## Folder Structure

```text
.
├── server.ts                          # Express server, auth/AI/weather endpoints & Vite middleware
├── server/
│   └── services/
│       ├── authService.ts             # Salted scrypt auth, HMAC session cookies & farmer store
│       ├── geminiService.ts           # Server-side trilingual Gemini soil & FAQ assistant
│       └── weatherService.ts          # Server-side OpenWeatherMap & trilingual farm insights
├── src/
│   ├── App.tsx                        # Session hydration, auth/profile-gated shell & hash routing
│   ├── index.css                      # Tailwind CSS & Telugu/Devanagari/Latin typography
│   ├── types/
│   │   └── app.ts                     # Shared TypeScript interfaces
│   ├── i18n/
│   │   └── translations.ts            # Complete Telugu (te), English (en), and Hindi (hi) dictionaries
│   ├── hooks/
│   │   ├── useLanguage.tsx            # Trilingual language context (defaults to Telugu)
│   │   ├── useSpeechRecognition.ts    # Browser voice input (te-IN / en-IN / hi-IN)
│   │   ├── useTextToSpeech.ts         # Browser Read-Aloud (prefers te-IN / hi-IN / en-IN)
│   │   └── useFarmProfile.ts          # Per-user local recent activity history hook
│   ├── utils/
│   │   ├── apiClient.ts               # Safe JSON fetch wrapper preventing raw JSON parse errors
│   │   ├── irrigationCalculator.ts    # Trilingual crop irrigation planner engine
│   │   └── waterBudgetCalculator.ts   # Trilingual water budget calculator
│   ├── data/
│   │   └── disasterData.ts            # Trilingual Cyclone, Flood & Drought checklists
│   ├── components/
│   │   ├── Header.tsx                 # Responsive authenticated top bar & logout
│   │   ├── Footer.tsx                 # Shared footer
│   │   ├── LanguageSelector.tsx       # Trilingual switcher (తెలుగు / English / हिन्दी)
│   │   ├── VoiceInputControl.tsx      # Mic control with 6 explicit browser states
│   │   ├── ReadAloudButton.tsx        # Play/stop TTS with language voice availability notice
│   │   └── RecentActivityModal.tsx    # Per-user saved calculations history modal
│   └── pages/
│       ├── AuthPage.tsx               # Login, Register & Forgot Password first screen
│       ├── ProfileSetupPage.tsx       # Required 3-section Farmer Profile Setup & Edit page
│       ├── HomePage.tsx               # Personalized dashboard, summary, 6 cards & quick voice AI
│       ├── SoilAnalysisPage.tsx
│       ├── IrrigationPlannerPage.tsx
│       ├── WaterBudgetPage.tsx
│       ├── WeatherPage.tsx
│       ├── DisasterPage.tsx
│       └── FaqAssistantPage.tsx
├── .env.example
├── index.html
├── metadata.json
└── package.json
```

---

## How to Run & Verify

```bash
npm install
npm run dev      # Starts Express + Vite on port 3000
npm run lint     # Runs tsc --noEmit
npm run build    # Builds Vite production bundle
```

### Environment Variables

- `GEMINI_API_KEY`: Server-side Gemini API key for Soil Image Analysis and Farmer FAQ / Voice Assistant.
- `WEATHER_API_KEY`: Optional server-side OpenWeatherMap API key for live local weather.
- `SESSION_SECRET`: Optional HMAC secret for signing session cookies.
