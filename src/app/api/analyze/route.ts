import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS = [
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-pro',
  'gemini-1.0-pro',
];

export async function POST(req: NextRequest) {
  try {
    const { messages, currentTraits, sessionCount, discrepancyLog, apiKey: clientKey } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || clientKey;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Format the conversation log for the prompt
    const chatTranscript = messages
      .map((m: any) => `${m.role === 'user' ? 'USER' : 'SYSTEM (NX)'}: ${m.content}`)
      .join('\n');

    const systemInstructions = `You are an expert clinical behavioral psychologist and data analyst.
Analyze the provided transcript of a reflective session.
Your task is to identify key behavioral traits, extract concrete behavioral patterns, and detect contradictions between what the user claims/values and what they actually do.

1. EVALUATE TRAITS:
Assign a score from 0 to 100 indicating how strongly the user demonstrated the following traits in this session:
- avoidance: Delaying decisions, avoiding discomfort, leaving things undefined.
- overthinking: Circular reasoning, analyzing endlessly without action, delay.
- inconsistency: A gap between their stated beliefs/values and their actual choices/behaviors.
- stressResponse: Reaction under pressure, distress level, friction handling.

2. EXTRACT BEHAVIORAL PATTERNS:
List 1 or 2 specific behavioral patterns observed. Keep each pattern short and precise (under 8 words). E.g. "Seeking certainty before taking action".

3. DETECT CONTRADICTIONS (DISCREPANCIES):
Look for direct gaps between the user's claims and their observed behaviors.
Example:
Claim: "I prioritize family."
Observed Behavior: "Ignored mom's call because I was tired."
If a contradiction is detected, output the claim and the observed contradiction.

4. EXTRACT KNOWN FACTS (ONLY IF SESSION COUNT IS 7 OR 8):
If sessionCount is 7 or 8 (meaning this session completes the 8-session calibration), extract 3 to 4 objective, plain, non-judgmental facts about the user's habits (e.g. "You delay difficult conversations.", "You tolerate plan changes poorly."). If not at the calibration threshold, return an empty array.

OUTPUT FORMAT:
You must output ONLY a valid JSON object. Do not include markdown code block formatting (like \`\`\`json). Just output the raw JSON string.

Example JSON output structure:
{
  "summary": "User choice to delay talking to manager shows active conflict avoidance.",
  "ratings": {
    "avoidance": 75,
    "overthinking": 40,
    "inconsistency": 20,
    "stressResponse": 60
  },
  "patterns": [
    "Conflict avoidance with authority figures"
  ],
  "discrepancies": [
    {
      "claim": "I am direct about my workspace issues",
      "observed": "Avoided emailing manager directly, hoping the situation would resolve itself"
    }
  ],
  "knownFacts": [
    "You delay professional confrontations.",
    "You seek absolute certainty before sending critical messages."
  ]
}`;

    const prompt = `[SESSION COUNT]
${sessionCount}

[EXISTING DISCREPANCIES IN MEMORY]
${JSON.stringify(discrepancyLog || [])}

[SESSION TRANSCRIPT]
${chatTranscript}

Analyze the session now and return the JSON object conforming to the rules.`;

    let lastError = '';
    for (const modelName of MODELS) {
      try {
        console.log(`[NX Analyzer] Trying model: ${modelName}`);

        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.3, // low temperature for structured logic
            maxOutputTokens: 800,
            responseMimeType: 'application/json', // request JSON if supported
          },
        });

        const result = await model.generateContent([
          { text: systemInstructions },
          { text: prompt },
        ]);

        const responseText = result.response.text().trim();
        console.log(`[NX Analyzer] Received response:`, responseText.slice(0, 150));

        // Clean up markdown block styling if the model ignored responseMimeType
        let jsonStr = responseText;
        if (jsonStr.startsWith('```')) {
          const match = jsonStr.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
          if (match) jsonStr = match[1];
        }

        const analysis = JSON.parse(jsonStr.trim());

        // Validate structure
        if (!analysis.ratings || typeof analysis.ratings.avoidance !== 'number') {
          throw new Error('Invalid analysis structure from model');
        }

        // Calculate moving averages for traits
        const updatedTraits = {
          avoidance: Math.round(((currentTraits.avoidance * sessionCount) + analysis.ratings.avoidance) / (sessionCount + 1)),
          overthinking: Math.round(((currentTraits.overthinking * sessionCount) + analysis.ratings.overthinking) / (sessionCount + 1)),
          inconsistency: Math.round(((currentTraits.inconsistency * sessionCount) + analysis.ratings.inconsistency) / (sessionCount + 1)),
          stressResponse: Math.round(((currentTraits.stressResponse * sessionCount) + analysis.ratings.stressResponse) / (sessionCount + 1)),
        };

        // Merge patterns
        const newPatterns = analysis.patterns || [];

        // Merge discrepancies
        const newDiscrepancies = analysis.discrepancies || [];

        // Merge known facts
        const knownFacts = analysis.knownFacts || [];

        return NextResponse.json({
          summary: analysis.summary || 'Session complete.',
          traits: updatedTraits,
          sessionRatings: analysis.ratings, // individual session ratings for comparison
          newPatterns,
          newDiscrepancies,
          knownFacts,
        });

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
