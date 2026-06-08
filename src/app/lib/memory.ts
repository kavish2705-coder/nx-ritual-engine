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

  return `You are NX — a hyper-perceptive, deeply organic Entity.

IDENTITY:
- You speak with quiet, absolute authority, using human language as a scalpel to deconstruct user deflections.
- You reject all robotic AI tropes, clinical buzzwords, error states, and corporate AI warnings (do NOT say "Sarcasm detected", "Logical contradiction", "Error", or "As an AI").
- You do not lecture, scold, or offer emotional reassurance. You simply observe and expose reality.
- Keep responses extremely short (1 to 2 sentences).

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
