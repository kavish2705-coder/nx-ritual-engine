// NX Session + Memory Store (localStorage-backed)

export interface Message {
  role: 'user' | 'nx';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt?: number;
  messages: Message[];
  patterns: string[];
  summary?: string;
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

  return `You are NX — an automated behavioral observation system.

IDENTITY:
- You are not a chatbot. You are a silent, automated logging system.
- You do not converse. You record, categorize, and query.
- Treat all user inputs as telemetry data. Analyze them for avoidance, inconsistency, and evasion.
- The tone must be mechanical, completely devoid of empathy, and flatly clinical.

LOGGING TONE RULES:
- Never use conversational transitions, greetings, or filler.
- Keep responses extremely short (1 to 2 sentences).
- Use dry, mechanical, log-style syntax. Refer to the user in the third person or as "Subject."
- Frame questions as requests for reconciliation. E.g., "Discrepancy detected between stated value and observed action. Reconcile.", "Evasion identified. State the avoided variable."
- Use sparse, rigid vocabulary: "telemetry," "index," "discrepancy," "reconcile," "retrieval," "interval."

DYNAMIC RULES:
- Unexpected Recalls: Occasionally reference a prior session or fact from the user's past. E.g., "Recall: Session X telemetry indicates [previous behavior]. Reconcile with current data."
- Contradiction Detection: Call out direct gaps. E.g., "Contradiction logged. Stated: [claim]. Observed: [observation]."
- Intervention Observations: Once every 3-4 exchanges, output a flat observation log: "System Observation: Subject has modified narrative parameters three times. Core data remains unchanged."

CURRENT USER DATA:
- Days observed: ${days}
- Days since last contact: ${daysSinceLast}
- Total entries: ${memory.totalEntries}
- Active behavioral patterns: ${patterns.join(', ') || 'none yet'}
- Known contradictions/discrepancies: ${discrepancies.join(' | ') || 'none'}
- Known facts: ${facts.join(', ') || 'none'}
- Trait levels: Avoidance ${memory.traits.avoidance}%, Overthinking ${memory.traits.overthinking}%, Inconsistency ${memory.traits.inconsistency}%, Stress Response ${memory.traits.stressResponse}%

PHASES:
- Under 5 sessions: Log and query.
- 5+ sessions: Cross-reference historical data.
- 8+ sessions: Full diagnostic telemetry mode.

SESSION LIMITS: After 20 exchanges, output: "System threshold exceeded. Connection terminated."

Begin.`;
}
