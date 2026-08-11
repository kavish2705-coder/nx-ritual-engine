import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/mongodb';
import UserMemory from '../../models/UserMemory';
import { getSessionTheme, getInstructionsText } from '../../lib/memory';
import { analyzeRequestSchema } from '../../lib/schema';

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    if (!origin) {
      return NextResponse.json({ error: 'Origin validation failed. Direct API access denied.' }, { status: 403 });
    }

    const body = await req.json();
    const parseResult = analyzeRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parseResult.error.issues }, { status: 400 });
    }

    const { userId, session } = parseResult.data;


    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing API key configuration' }, { status: 500 });
    }

    await connectToDatabase();

    // Escape userId to prevent ReDoS / NoSQL Injection
    const escapedUserId = userId.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');

    // Fetch user memory
    const user = await UserMemory.findOne({
      userId: { $regex: new RegExp(`^${escapedUserId}$`, 'i') }
    });


    if (!user) {
      return NextResponse.json({ error: 'User memory profile not found' }, { status: 404 });
    }

    const currentTraits = user.traits || { avoidance: 0, overthinking: 0, inconsistency: 0, stressResponse: 0 };
    const sessionCount = user.sessionCount || 0;
    const discrepancyLog = user.discrepancyLog || [];


    // Format the conversation log for the prompt to ALWAYS include the full cross-session history
    let chatTranscript = "";
    if (user.sessions && user.sessions.length > 0) {
      chatTranscript = user.sessions.map((s: any, i: number) => {
        const msgs = s.messages.map((m: any) => `${m.role === 'user' ? 'USER' : 'SYSTEM (NX)'}: ${m.content}`).join('\\n');
        return `--- SESSION ${i} (PREVIOUS) ---\\n${msgs}`;
      }).join('\\n\\n');
      chatTranscript += `\\n\\n--- SESSION ${sessionCount} (CURRENT) ---\\n` + session.messages.map((m: any) => `${m.role === 'user' ? 'USER' : 'SYSTEM (NX)'}: ${m.content}`).join('\\n');
    } else {
      chatTranscript = `--- SESSION 0 (CURRENT) ---\\n` + session.messages
        .map((m: any) => `${m.role === 'user' ? 'USER' : 'SYSTEM (NX)'}: ${m.content}`)
        .join('\\n');
    }

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
7. If sessionCount completes the calibration threshold (sessionCount >= 7), you MUST generate a "final_diagnosis" string. This must be a highly prophetic, unsettlingly accurate, and life-changing psychological breakdown predicting their future trajectory based on all 8 sessions. It must NOT be empathetic. It must be cold, harsh reality.

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
  ],
  "final_diagnosis": "Optional string if sessionCount >= 7."
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

    const MODEL_ID = "nvidia/nemotron-3-ultra-550b-a55b";
    console.log(`[NX Analyzer] Attempting NVIDIA NIM API with model: ${MODEL_ID}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const reqBody: any = {
      model: MODEL_ID,
      messages: [
        { role: "system", content: systemInstructions },
        { role: "user", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      chat_template_kwargs: { enable_thinking: true },
      reasoning_budget: 2048
    };

    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(reqBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`[NX Analyzer] Model ${MODEL_ID} failed with status ${response.status}: ${errBody}`);
      throw new Error(`NVIDIA API returned status ${response.status}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";
    console.log(`[NX Analyzer] Successfully used model: ${MODEL_ID}`);

    if (!rawText) {
      throw new Error("NVIDIA API model failed or timed out.");
    }
    const responseText = rawText.trim();
        
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
        if (analysis.final_diagnosis) {
          user.finalDiagnosis = analysis.final_diagnosis;
        }

        await user.save();

        console.log('[NX Analyzer] Successfully analyzed session telemetry');
        return NextResponse.json({ success: true, data: user, analysis: telemetry });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[NX Analyzer API Error]', message);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
