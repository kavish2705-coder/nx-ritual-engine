# NX // Ritual Calibration Engine

`NX` is a cold, clinical, and unsettling behavioral observation interface designed to observe, log, and analyze user cognitive patterns. Through a structured 8-session calibration ritual, it tracks and maps behavioral traits, exposes contradictions between claims and actions, and compiles an uncompromising profile of the subject's decision-making mechanics.

---

## Core Features

- **Automated Behavioral Telemetry**: An interactive terminal driven by Gemini models. It operates with a dry, mechanical, logging-style persona that rejects conversational padding in favor of diagnostic queries.
- **Centralized User Memory**: Direct integration with a MongoDB cloud database via Mongoose, tracking session history, known facts, behavioral patterns, and moving averages of core traits.
- **Real-Time Trait Calibration**: Dynamic moving average algorithms that score and calibrate four distinct behavioral vectors:
  - **Avoidance**: Postponing critical interactions or choosing immediate comfort.
  - **Overthinking**: Circular reasoning and excessive analysis causing operational delay.
  - **Inconsistency**: Discrepancies between stated values/claims and actual observed behaviors.
  - **Stress Response**: Friction and pressure tolerance levels.
- **Cascade Fallback Chain**: Robust API integration designed to prioritize Gemini Pro models (`gemini-2.5-pro`, `gemini-pro-latest`) and seamlessly cascade through Standard and Lightweight Flash models (`gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`) if developer API quotas are exhausted.
- **Atmospheric Visuals**: A premium dark-mode interface featuring particle fog, SVG/Canvas candle animations that pulse into a warning crimson red during unstable states, and a staggered typewriter glitch sequence announcing the conclusion of the ritual.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, TypeScript)
- **Database**: MongoDB (Atlas) & Mongoose ODM
- **Animation**: Framer Motion & HTML Canvas
- **AI Integration**: `@google/generative-ai` (Google AI Studio SDK)

---

## Environment Variables

To run the application, configure a `.env.local` file in the project root containing:

```env
# MongoDB Cloud Connection
MONGODB_URI=mongodb+srv://...

# Google AI Studio API Key
GEMINI_API_KEY=AIzaSy...

# (Optional) Force the app to try a specific model first
GEMINI_MODEL=gemini-2.5-pro
```

---

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the local development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

4. Run a production build to check compilation:
   ```bash
   npm run build
   ```
