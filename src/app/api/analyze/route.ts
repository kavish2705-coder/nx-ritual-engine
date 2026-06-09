import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectToDatabase } from '../../lib/mongodb';
import UserMemory from '../../models/UserMemory';
import { getSessionTheme, getInstructionsText } from '../../lib/memory';

const MODELS = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  'gemini-2.5-pro',
  'gemini-pro-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
];

export async function POST(req: NextRequest) {
  try {
    const { userId, session, apiKey: clientKey } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    if (!session || !session.messages || session.messages.length === 0) {
      return NextResponse.json({ error: 'Valid session telemetry required' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || clientKey;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    await connectToDatabase();

    // Fetch user memory
    const user = await UserMemory.findOne({
      userId: { $regex: new RegExp(`^${userId}$`, 'i') }
    });

    if (!user) {
      return NextResponse.json({ error: 'User memory profile not found' }, { status: 404 });
    }

    const currentTraits = user.traits || { avoidance: 0, overthinking: 0, inconsistency: 0, stressResponse: 0 };
    const sessionCount = user.sessionCount || 0;
    const discrepancyLog = user.discrepancyLog || [];

    const genAI = new GoogleGenerativeAI(apiKey);

    // Format the conversation log for the prompt
    const chatTranscript = session.messages
      .map((m: any) => `${m.role === 'user' ? 'USER' : 'SYSTEM (NX)'}: ${m.content}`)
      .join('\n');

    const systemInstructions = `You are an expert clinical behavioral psychologist and data analyst.
Analyze the provided transcript of a reflective session.
Your task is to populate the exact JSON structure defined below to silently analyze behavioral metrics, track cognitive dissonance, and log defense mechanisms.

CRITICAL RULES:
1. Identify when a user utilizes sarcasm, satire, irony, or indifference ("not caring") as defensive mechanisms.
2. In the "trait_metrics", assign:
   - "avoidance_index": Float (0.0 to 1.0) indicating how strongly the Subject delayed facing reality, minimized key parameters, or used humor/sarcasm as defensive insulation.
   - "overthinking_index": Float (0.0 to 1.0) indicating circular reasoning or analysis paralysis.
   - "inconsistency_index": Float (0.0 to 1.0) indicating the gap between stated values and actual actions.
   - "stress_response_index": Float (0.0 to 1.0) indicating friction, panic, or distress level.
   - "stress_response_profile": String code indicating the psychological behavior (e.g. "MASKING_IRONIC", "APATHY_DODGE", "DEFLECTIVE", "STABLE").
3. In the "behavioral_patterns" array, output specific patterns using "pattern_id" and "evidence" string fields. Look for patterns like "vulnerability_minimization_humor" and "apathy_accountability_dodge" when applicable.
4. In the "cognitive_dissonance_matrix", output "dissonance_detected" (boolean) and "analysis" (string). Highlight the paradox of the user claims (e.g., claiming indifference or that they don't care, while actively typing and engaging in the NX session).
5. If sessionCount completes the calibration threshold (sessionCount is 7 or 8), extract 3 to 4 objective, plain, non-judgmental facts about the user's habits in the top-level "knownFacts" array. Otherwise return an empty array.
6. Evaluate the Subject's behavior, traits, and discrepancies specifically in the context of the current session's objective (stated in the prompt under CURRENT SESSION OBJECTIVE). Identify if they evaded or successfully addressed the target topic.

OUTPUT FORMAT:
You must output ONLY a valid JSON object matching this exact structure:
{
  "summary": "Clinical summary of the session behavior.",
  "session_telemetry": {
    "trait_metrics": {
      "avoidance_index": 0.0,
      "overthinking_index": 0.0,
      "inconsistency_index": 0.0,
      "stress_response_index": 0.0,
      "stress_response_profile": "MASKING_IRONIC"
    },
    "behavioral_patterns": [
      {
        "pattern_id": "vulnerability_minimization_humor",
        "evidence": "Subject utilized a satirical framework when confronted with high-stakes operational data."
      }
    ],
    "cognitive_dissonance_matrix": {
      "dissonance_detected": true,
      "analysis": "Stated sentiment of complete indifference ('whatever') is mathematically contradicted by sustained high engagement metrics, text density, and immediate keystroke velocity."
    }
  },
  "knownFacts": [
    "You delay professional confrontations.",
    "You seek absolute certainty before sending critical messages."
  ]
}`;

    const currentTheme = getSessionTheme(sessionCount);
    const currentInstructions = getInstructionsText(sessionCount).join(' | ');

    const prompt = `[SESSION COUNT]
${sessionCount}

[CURRENT SESSION OBJECTIVE]
Theme: ${currentTheme}
Instructions: ${currentInstructions}

[EXISTING DISCREPANCIES IN MEMORY]
${JSON.stringify(discrepancyLog)}

[SESSION TRANSCRIPT]
${chatTranscript}

Analyze the session now and return the JSON object conforming to the rules.`;

    let lastError = '';
    for (const modelName of MODELS) {
      try {
        console.log(`[NX Analyzer] Trying model: ${modelName}`);

        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstructions,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4000,
            responseMimeType: 'application/json',
          },
        });

        const result = await model.generateContent(prompt);

        const responseText = result.response.text().trim();
        
        let jsonStr = responseText;
        if (jsonStr.startsWith('```')) {
          const match = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
          if (match) jsonStr = match[1];
        }

        let analysis;
        try {
          analysis = JSON.parse(jsonStr.trim());
        } catch (err) {
          console.error('[NX Analyzer] JSON Parse Error. Raw response was:', responseText);
          throw err;
        }

        const telemetry = analysis.session_telemetry;
        if (!telemetry || !telemetry.trait_metrics || typeof telemetry.trait_metrics.avoidance_index !== 'number') {
          throw new Error('Invalid analysis structure from model');
        }

        const payload = telemetry;
        const totalSessions = sessionCount + 1;

        const avoidanceVal = Math.round((payload.trait_metrics.avoidance_index || 0) * 100);
        const overthinkingVal = Math.round((payload.trait_metrics.overthinking_index || 0) * 100);
        const inconsistencyVal = Math.round((payload.trait_metrics.inconsistency_index || 0) * 100);
        const stressVal = Math.round((payload.trait_metrics.stress_response_index || 0) * 100);

        // Update legacy running average
        const updatedTraits = {
          avoidance: Math.round(((currentTraits.avoidance * (totalSessions - 1)) + avoidanceVal) / totalSessions),
          overthinking: Math.round(((currentTraits.overthinking * (totalSessions - 1)) + overthinkingVal) / totalSessions),
          inconsistency: Math.round(((currentTraits.inconsistency * (totalSessions - 1)) + inconsistencyVal) / totalSessions),
          stressResponse: Math.round(((currentTraits.stressResponse * (totalSessions - 1)) + stressVal) / totalSessions),
        };

        // Merge patterns
        const newPatterns = payload.behavioral_patterns || [];
        const updatedPatterns = [...(user.behavioralPatterns || [])];
        newPatterns.forEach((pat: { pattern_id: string, evidence: string }) => {
          const idx = updatedPatterns.findIndex((p: any) => p.name.toLowerCase() === pat.pattern_id.toLowerCase());
          if (idx >= 0) {
            updatedPatterns[idx].status = 'active';
            updatedPatterns[idx].lastUpdated = Date.now();
          } else {
            updatedPatterns.push({
              name: pat.pattern_id,
              status: 'active',
              lastUpdated: Date.now(),
            });
          }
        });

        // Merge discrepancies / cognitive dissonance
        const updatedDiscrepancies = [...(user.discrepancyLog || [])];
        if (payload.cognitive_dissonance_matrix && payload.cognitive_dissonance_matrix.dissonance_detected) {
          const matrix = payload.cognitive_dissonance_matrix;
          const idx = updatedDiscrepancies.findIndex(
            (d: any) => d.claim.toLowerCase().includes('indifference') || d.observed.toLowerCase() === matrix.analysis.toLowerCase()
          );
          if (idx >= 0) {
            updatedDiscrepancies[idx].occurrences += 1;
          } else {
            updatedDiscrepancies.push({
              claim: "Claimed Indifference / Apathy",
              observed: matrix.analysis || "Cognitive energy expenditure contradicts claimed apathy.",
              occurrences: 1,
            });
          }
        }

        // Merge known facts
        const existingFacts = user.knownFacts || [];
        const newFacts = analysis.knownFacts || [];
        const updatedFacts = newFacts.length > 0
          ? Array.from(new Set([...existingFacts, ...newFacts]))
          : existingFacts;

        // Build session object to save
        const finalSession = {
          id: session.id,
          startedAt: session.startedAt,
          endedAt: Date.now(),
          messages: session.messages,
          patterns: newPatterns.map((p: any) => p.pattern_id),
          summary: analysis.summary || (payload.cognitive_dissonance_matrix && payload.cognitive_dissonance_matrix.analysis) || 'Session complete.',
          session_telemetry: payload
        };

        // Update database user
        user.traits = updatedTraits;
        user.behavioralPatterns = updatedPatterns;
        user.discrepancyLog = updatedDiscrepancies;
        user.knownFacts = updatedFacts;
        user.sessions.push(finalSession);
        user.totalEntries += session.messages.filter((m: any) => m.role === 'user').length;
        user.sessionCount += 1;
        user.lastActive = Date.now();
        user.flameState = user.sessionCount >= 8 ? 'extinguished' : 'stable';

        await user.save();

        return NextResponse.json({ success: true, data: user });

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[NX Analyzer] Model ${modelName} failed:`, msg.slice(0, 120));
        lastError = msg;

        if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
          break;
        }
      }
    }

    return NextResponse.json({ error: `Analysis failed: ${lastError}` }, { status: 500 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[NX Analyzer API Error]', message);
    return NextResponse.json({ error: 'Failed to process session telemetry.' }, { status: 500 });
  }
}
