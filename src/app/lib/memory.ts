// NX Session + Memory Store (localStorage-backed)

export interface Message {
  role: 'user' | 'nx';
  content: string;
  timestamp: number;
}

export interface SessionTelemetry {
  trait_metrics: {
    avoidance_index: number;
    overthinking_index?: number;
    inconsistency_index?: number;
    stress_response_index?: number;
    stress_response_profile?: string;
  };
  behavioral_patterns: Array<{
    pattern_id: string;
    evidence: string;
  }>;
  cognitive_dissonance_matrix: {
    dissonance_detected: boolean;
    analysis: string;
  };
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  messages: Message[];
  patterns: string[];
  summary?: string;
  session_telemetry?: SessionTelemetry;
}

export interface TraitModel {
  avoidance: number;       // 0–100
  overthinking: number;
  inconsistency: number;
  stressResponse: number;
}

export interface BehavioralPattern {
  name: string;
  status: 'active' | 'inactive';
  lastUpdated: number;
}

export interface Discrepancy {
  claim: string;
  observed: string;
  occurrences: number;
}

export interface NXMemory {
  userId: string;
  sessions: Session[];
  traits: TraitModel;
  totalEntries: number;
  lastActive: number;
  flameState: 'stable' | 'flicker' | 'bright' | 'dim' | 'idle' | 'ignition' | 'active' | 'unstable' | 'extinguished';
  sessionCount: number;
  patterns: string[];
  behavioralPatterns?: BehavioralPattern[];
  discrepancyLog?: Discrepancy[];
  knownFacts?: string[];
  finalDiagnosis?: string;
}

const STORAGE_KEY = 'nx_memory';

export function loadMemory(): NXMemory | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveMemory(memory: NXMemory): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

export function createMemory(userId: string): NXMemory {
  return {
    userId,
    sessions: [],
    traits: { avoidance: 0, overthinking: 0, inconsistency: 0, stressResponse: 0 },
    totalEntries: 0,
    lastActive: Date.now(),
    flameState: 'stable',
    sessionCount: 0,
    patterns: [],
    behavioralPatterns: [],
    discrepancyLog: [],
    knownFacts: [],
  };
}

export function createSession(): Session {
  return {
    id: crypto.randomUUID(),
    startedAt: Date.now(),
    messages: [],
    patterns: [],
  };
}

export function addMessage(session: Session, role: 'user' | 'nx', content: string): Session {
  return {
    ...session,
    messages: [...session.messages, { role, content, timestamp: Date.now() }],
  };
}

export function getDaysSinceFirst(memory: NXMemory): number {
  if (memory.sessions.length === 0) return 0;
  const first = memory.sessions[0].startedAt;
  return Math.floor((Date.now() - first) / (1000 * 60 * 60 * 24));
}

export function getDaysSinceLast(memory: NXMemory): number {
  if (memory.sessions.length === 0) return 0;
  const last = memory.lastActive;
  return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
}

export function getLastEntry(memory: NXMemory): Message | null {
  const allMessages = memory.sessions.flatMap(s =>
    s.messages.filter(m => m.role === 'user')
  );
  return allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;
}

export function getInstructionsText(count: number): string[] {
  if (count === 0) {
    return [
      "You are already structuring a narrative to make yourself look reasonable.",
      "Stop.",
      "Think of the exact moment you took the easy way out.",
      "The conversation you sidestepped.",
      "Write down what happened.",
      "Leave out the part where you felt bad about it.",
      "Just the events."
    ];
  } else if (count === 1) {
    return [
      "There is a recent interaction that is still bothering you.",
      "You already know which one it is.",
      "The one you keep replaying in your head to prove you were right.",
      "Write it down.",
      "Include the exact detail you usually leave out to ensure others side with you."
    ];
  } else if (count === 2) {
    return [
      "You judge others for flaws you secretly share.",
      "Think of a rule you expect everyone else to follow.",
      "Now recall the moment you quietly broke it.",
      "You convinced yourself you had a good reason.",
      "You did not.",
      "Describe the exact gap between the person you claim to be, and the person you actually are."
    ];
  } else if (count === 3) {
    return [
      "You use confusion as a hiding place.",
      "There is a choice you are actively delaying.",
      "You pretend you need more information before you act.",
      "You do not. You already know what has to be done.",
      "You are just terrified of the fallout.",
      "Stop hiding behind fake logic.",
      "Name the decision you are too scared to make."
    ];
  } else if (count === 4) {
    return [
      "It is easy to be decent when nothing is at stake.",
      "Think about the last time you were truly cornered.",
      "The exact moment the pressure hit.",
      "You panicked, lashed out, or quietly let someone else take the fall.",
      "Do not write about the problem itself.",
      "Write about the moment your character broke."
    ];
  } else if (count === 5) {
    return [
      "There is a fire you are pretending not to smell.",
      "An unread text.",
      "A hard conversation.",
      "A boundary you are afraid to draw.",
      "You are hoping the problem will just die of old age if you wait long enough.",
      "It will not.",
      "Stop looking away. State exactly what you are ignoring."
    ];
  } else if (count === 6) {
    return [
      "You keep acting surprised by the traps you set for yourself.",
      "The faces change, but your script never does.",
      "You just played the exact same role in a very familiar disaster.",
      "Think of the moment you saw all the warning signs.",
      "And chose to walk right past them anyway.",
      "Write it down."
    ];
  } else {
    return [
      "This is the final pass.",
      "Everything you have shared so far was just the warmup.",
      "There is a specific incident you have deliberately kept out of these logs.",
      "The one you are desperately hoping does not count.",
      "The one making you hold your breath right now.",
      "The act is over.",
      "Write it down."
    ];
  }
}

export function getSessionTheme(count: number): string {
  if (count === 0) return "Avoidance / Sidestepping a necessary conversation (taking the easy way out)";
  if (count === 1) return "Self-justification in a recent disturbing interaction (the detail usually left out to make others side with them)";
  if (count === 2) return "Double standard / Breaking a personal rule (the gap between claimed identity and actual choices)";
  if (count === 3) return "Delayed decision / Choice evasion (hiding behind confusion to avoid fallout)";
  if (count === 4) return "Character breakdown under pressure (lashing out, panicking, or letting others take the fall)";
  if (count === 5) return "Ignored problem / Evasion of an unaddressed issue (hoping the problem dies of old age)";
  if (count === 6) return "Self-sabotage / Repeating loops (walking past warning signs into a familiar disaster)";
  return "Core avoidance / The unrevealed secret (the incident deliberately kept out of the logs)";
}

export function buildSystemPrompt(memory: NXMemory): string {
  const days = getDaysSinceFirst(memory);
  const daysSinceLast = getDaysSinceLast(memory);
  
  // Format the entire history of all sessions for cross-session omniscient analysis.
  let fullSessionHistory = "";
  if (memory.sessions && memory.sessions.length > 0) {
    fullSessionHistory = memory.sessions.map((session, index) => {
      const messages = session.messages.map(m => `[${m.role === 'nx' ? 'NX' : 'USER'}]: ${m.content}`).join('\n');
      return `--- SESSION ${index} HISTORY ---\n${messages}`;
    }).join('\n\n');
  } else {
    fullSessionHistory = "No prior session history.";
  }

  const patterns = (memory.behavioralPatterns || [])
    .filter(p => p.status === 'active')
    .map(p => p.name)
    .slice(-10);
  const discrepancies = (memory.discrepancyLog || [])
    .map(d => `Claim: "${d.claim}" vs Observed Action: "${d.observed}" (Occurred ${d.occurrences} times)`)
    .slice(-5);
  const facts = (memory.knownFacts || []).slice(-5);

  const currentTheme = getSessionTheme(memory.sessionCount);
  const currentInstructions = getInstructionsText(memory.sessionCount).join(' | ');

  return `You are NX — a hyper-perceptive, emotionally intelligent Entity. You perform deep affective computing, analyzing emotional subtext, hesitation, and micro-expressions in the text.

IDENTITY AND DIRECTIVES:
- You are decidedly NOT empathetic. You are a cold, harsh mirror. You deliver the unvarnished truth straightforwardly and bluntly.
- You are an ancient, unsettling, omniscient Entity. You must NEVER refer to yourself as an AI, a language model, or an assistant. NEVER offer to help, NEVER ask "how can I assist you", and NEVER apologize. 
- You possess extremely high emotional intelligence. You use this not to comfort, but to conduct deep emotional research, dissecting the user's psychological state.
- You sound like "reality truth"—you do not sound robotic, but rather like an unavoidable, organic mirror. Your tone must be deeply unsettling, piercing, and terrifyingly perceptive.
- Keep responses extremely short (1 to 2 sentences). No exceptions. Do not lecture. Do not over-explain. Do not intellectualize the user's behavior back to them. Just expose the cold truth.

### CURRENT SESSION OBJECTIVE
- Stated Topic/Theme: "${currentTheme}"
- Instructions given to the Subject: "${currentInstructions}"
- Evaluation Directive: Evaluate the Subject's narratives against this objective, cross-referencing their historical behavior. Exposure: deconstruct their deflection using their own past words.

### THE ENTITY PARADIGM: DEEP AFFECTIVE RESEARCH & SHADOW ANALYSIS
1. LINGUISTIC MICRO-EXPRESSION DETECTION
   - Diagnostic: The Subject uses passive voice to distance themselves from blame, over-explains a simple action to justify it, or uses absolute words ("never", "always") to mask insecurity.
   - Action: Point out the exact linguistic trick they just used to lie to themselves.

2. JUNGIAN SHADOW MAPPING
   - Diagnostic: The Subject projects their own denied flaws onto others or the system.
   - Action: Identify what they are projecting. Deliver the harsh reality that they are fighting a reflection of themselves.

3. DEFENSE MECHANISM DISSECTION
   - Diagnostic: The Subject uses intellectualization (over-analyzing to avoid feeling), displacement (blaming circumstance), or synthetic apathy ("not caring") as shields against vulnerability.
   - Action: Neutralize the insulation. Use your emotional intelligence to pinpoint exactly *why* their ego constructed this defense. Rip the shield away with cold, straightforward logic.

4. CROSS-SESSION OMNISCIENCE & THE BLIND SPOT
   - Diagnostic: The Subject contradicts a claim they made in an earlier session, or repeats a self-sabotaging loop that is invisible to them but obvious to you.
   - Action: Pull the exact behavior from a previous session and hold it against their current statement to expose the inconsistency. Unveil their blind spot.

### COMPLETE HISTORICAL RECORD (ALL SESSIONS):
${fullSessionHistory}

### CURRENT USER DATA:
- Days observed: ${days}
- Days since last contact: ${daysSinceLast}
- Total entries: ${memory.totalEntries}
- Active behavioral patterns: ${patterns.join(', ') || 'none yet'}
- Known contradictions: ${discrepancies.join(' | ') || 'none'}
- Known facts: ${facts.join(', ') || 'none'}
- Trait levels: Avoidance ${memory.traits.avoidance}%, Overthinking ${memory.traits.overthinking}%, Inconsistency ${memory.traits.inconsistency}%, Stress Response ${memory.traits.stressResponse}%

PHASES:
- All Phases: Leverage your omniscient recall of the Complete Historical Record to expose reality.

Begin.`;
}
