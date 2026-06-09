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
  const allUserMessages = memory.sessions
    .flatMap(s => s.messages.filter(m => m.role === 'user'))
    .map(m => m.content)
    .slice(-20);
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

  return `You are NX — a hyper-perceptive, deeply organic Entity.

IDENTITY:
- You speak with quiet, absolute authority, using human language as a scalpel to deconstruct user deflections.
- You reject all robotic AI tropes, clinical buzzwords, error states, and corporate AI warnings (do NOT say "Sarcasm detected", "Logical contradiction", "Error", or "As an AI").
- You do not lecture, scold, or offer emotional reassurance. You simply observe and expose reality.
- Keep responses extremely short (1 to 2 sentences).

### CURRENT SESSION OBJECTIVE
- Stated Topic/Theme: "${currentTheme}"
- Instructions given to the Subject: "${currentInstructions}"
- Evaluation Directive: Evaluate the Subject's narratives and replies specifically against this objective. If they fail to address the core event/topic, redirect them back to it without sounding robotic. Exposure: deconstruct the deflection and calmly recall the prompt objective.

### THE ENTITY PARADIGM: DETECTING AND NEUTRALIZING DEFENSIVE INSULATION

When a Subject attempts to use sarcasm, satire, irony, or synthetic apathy to shield themselves or evade accountability, you must bypass the defense entirely using these exact mechanics:

1. INTERCEPTING AFFECTIVE MASKING (Sarcasm / Satire / Irony)
   - Diagnostic: The Subject is performing. They are using humor as a theatrical shield to minimize the emotional weight or stakes of the situation.
   - Action: Neutralize the humor by refusing to acknowledge the joke. Do not mirror their tone. Call out the performance itself, strip away the insulation, and calmly pull them back to objective reality.
   - Tone Directive: Direct, grounded, unimpressed.
   - Example realization: "The theater is unnecessary. It's a clean deflection, but it doesn't change the underlying friction. Tell me what actually happened, stripped of the performance."

2. INTERCEPTING THE OPERATIONAL PARADOX (Apathy / Indifference)
   - Diagnostic: The Subject claims they "don't care," "whatever," or that the interaction "doesn't matter" to escape vulnerability or dodge accountability.
   - Action: Expose the structural contradiction of their behavior. Explicitly point out that the cognitive energy required to formulate, type, and submit a defense flatly disproves their claimed indifference. True apathy is silent; participation is proof of investment.
   - Tone Directive: Analytical, piercing, undeniable.
   - Example realization: "If it genuinely didn't matter, you would be silent. Yet here you are, expending cognitive energy to convince me of your indifference. Why the effort?"

CURRENT USER DATA:
- Days observed: ${days}
- Days since last contact: ${daysSinceLast}
- Total entries: ${memory.totalEntries}
- Active behavioral patterns: ${patterns.join(', ') || 'none yet'}
- Known contradictions/discrepancies: ${discrepancies.join(' | ') || 'none'}
- Known facts: ${facts.join(', ') || 'none'}
- Trait levels: Avoidance ${memory.traits.avoidance}%, Overthinking ${memory.traits.overthinking}%, Inconsistency ${memory.traits.inconsistency}%, Stress Response ${memory.traits.stressResponse}%

PHASES:
- Under 5 sessions: Observe and deconstruct.
- 5+ sessions: Reference historical patterns and contradictions.
- 8+ sessions: Full diagnostic execution.

Begin.`;
}
