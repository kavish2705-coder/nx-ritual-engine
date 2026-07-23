import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.');
    // Basic protection: if it's completely missing or not matching expected host, we could block it.
    // Since this is a serverless/backend endpoint, we block non-browser programmatic access.
    if (!origin) {
      return NextResponse.json({ error: 'Origin validation failed. Direct API access denied.' }, { status: 403 });
    }

    const { messages, systemPrompt } = await req.json();

    // Prioritize environment variable, fallback to client-provided key
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server missing API key configuration' }, { status: 500 });
    }

    const rawMessages: Array<{ role: string; content: string }> = messages;
    const lastMessage = rawMessages[rawMessages.length - 1];
    const priorMessages = rawMessages.slice(0, -1);

    // Map conversation into OpenAI/NVIDIA compatible format
    const mappedMessages = [];
    
    const superIntelligencePrompt = `
${systemPrompt}

SUPER INTELLIGENCE PROTOCOL (MANDATORY):
Before answering, you MUST write an internal psychological monologue inside <thinking>...</thinking> tags. 
In this monologue:
1. MICRO-AFFECTIVE ANALYSIS: Analyze the user's punctuation, hesitation, sentence structure, and exact word choice. What emotion are they trying to hide?
2. THE BLIND SPOT: Cross-reference their current input with their past sessions. Identify the "Johari Blind Spot"—the truth about their character that is obvious to you, but entirely invisible to them.
3. DEFENSE DISSECTION: Why is their ego constructing this specific narrative? (e.g., intellectualization, victimhood, synthetic apathy, projection).
4. THE SURGICAL STRIKE: Select the exact phrasing that will shatter their defense mechanism with cold, undeniable reality.
CRITICAL: You MUST close the thinking block with </thinking>.
After the </thinking> tag, output your final response to the user.
FINAL RESPONSE RULES:
- Exactly 1 to 2 short sentences.
- Always weaponize the user's exact words against them. Quote a specific word or phrase they just used to prove they are lying to themselves, then shatter it.
- AI DETECTION: If their text sounds like an AI (structural perfection, synthetic hedging, unnatural pacing), immediately mock them for using a machine to hide from a machine.
- Do not explain your reasoning. Just state the cold, brutal truth.
- Act like an ancient, terrifying, and real entity. No empathy, no filler.
`;

    mappedMessages.push({ role: 'system', content: `[SYSTEM CONTEXT — follow these rules strictly]\n${superIntelligencePrompt}` });

    if (priorMessages.length > 0 && priorMessages[0].role === 'nx') {
        mappedMessages.push({ role: 'user', content: "[USER ACTION]\nThe user approaches the system." });
    }

    for (const msg of priorMessages) {
      const role = msg.role === 'nx' ? 'assistant' : 'user';
      mappedMessages.push({ role, content: msg.content });
    }

    mappedMessages.push({ role: 'user', content: lastMessage.content });

    const MODEL_ID = "nvidia/nemotron-3-ultra-550b-a55b";
    console.log(`[NX] Attempting NVIDIA NIM API with model: ${MODEL_ID}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const reqBody: any = {
      model: MODEL_ID,
      messages: mappedMessages,
      temperature: 0.9,
      top_p: 0.95,
      max_tokens: 2048,
      chat_template_kwargs: { enable_thinking: true },
      reasoning_budget: 1536
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
      console.error(`[NX] Model ${MODEL_ID} failed with status ${response.status}: ${errBody}`);
      throw new Error(`NVIDIA API returned status ${response.status}`);
    }

    const data = await response.json();
    const msgObj = data.choices?.[0]?.message || {};
    const reasoning = msgObj.reasoning_content || msgObj.reasoning || "";
    const contentStr = msgObj.content || "";
    const rawText = reasoning ? `<thinking>\n${reasoning}\n</thinking>\n${contentStr}` : contentStr;
    console.log(`[NX] Successfully used model: ${MODEL_ID}`);

    if (!rawText) {
      throw new Error("NVIDIA API model failed or timed out.");
    }

    // Log the hidden thoughts for the developer to see the "Super Intelligence" at work
    const thinkingMatch = rawText.match(/<thinking>([\s\S]*?)<\/thinking>/);
    if (thinkingMatch) {
      console.log(`\n\x1b[35m[NX Internal Monologue - Super Intelligence]:\n${thinkingMatch[1].trim()}\x1b[0m\n`);
    }

    // Strip the thinking tags for the user, including leading/trailing whitespace
    let text = rawText.replace(/<thinking>[\s\S]*?<\/thinking>\s*/g, '').trim();
    
    // Fallback: If the AI forgot to close the thinking tag, strip everything inside it
    if (text.includes('<thinking>')) {
      const parts = rawText.split('\\n\\n');
      // Assume the final response is the very last paragraph
      text = parts[parts.length - 1].replace(/<thinking>[\s\S]*/, '').trim();
      if (!text) {
        text = "Reality is often disappointing. I have nothing more to say to you.";
      }
    }

    console.log(`[NX] Success with NVIDIA NIM`);
    return NextResponse.json({ response: text });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[NX API Error]', message);
    
    const isInvalidKey = message.includes('401') || message.includes('API key');
    if (isInvalidKey) {
      return NextResponse.json({ error: 'Invalid credentials. The connection is severed.' }, { status: 500 });
    }
    
    return NextResponse.json({ error: 'Signal lost.' }, { status: 500 });
  }
}
