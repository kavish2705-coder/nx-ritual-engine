import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Models to try in order of preference
const MODELS = [
  'gemini-2.5-pro',
  'gemini-pro-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
  'gemini-3.5-flash',
];

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, apiKey: clientKey } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY || clientKey;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Build conversation — inject system prompt as first user turn
    // (works across all Gemini model versions)
    const rawMessages: Array<{ role: string; content: string }> = messages;

    // Separate last user message from history
    const lastMessage = rawMessages[rawMessages.length - 1];
    const priorMessages = rawMessages.slice(0, -1);

    // Build history: strict alternation, start with user, end with model
    const historyParts: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

    let currentRole: 'user' | 'model' = 'user';
    let currentText = `[SYSTEM CONTEXT — follow these rules strictly]\n${systemPrompt}\n\n`;

    if (priorMessages.length > 0 && priorMessages[0].role === 'nx') {
      currentText += `[USER ACTION]\nThe user approaches the system.`;
      historyParts.push({ role: 'user', parts: [{ text: currentText }] });
      currentText = '';
      currentRole = 'model';
    } else if (priorMessages.length > 0 && priorMessages[0].role === 'user') {
      // First message is user, it will be combined with system prompt
    }

    for (const msg of priorMessages) {
      const role = msg.role === 'nx' ? 'model' : 'user';
      if (role === currentRole) {
        currentText += (currentText ? '\n\n' : '') + msg.content;
      } else {
        if (currentText) {
          historyParts.push({ role: currentRole, parts: [{ text: currentText }] });
        }
        currentRole = role;
        currentText = msg.content;
      }
    }

    if (currentText) {
      historyParts.push({ role: currentRole, parts: [{ text: currentText }] });
    }

    // The actual message to send
    let sendText = lastMessage.content;
    if (historyParts.length === 0) {
      // No prior history — inject system prompt into the current message
      sendText = `[SYSTEM CONTEXT — follow these rules strictly]\n${systemPrompt}\n\n[USER MESSAGE]\n${lastMessage.content}`;
    } else if (historyParts[historyParts.length - 1].role === 'user') {
      // If history somehow ends with a user message, we must combine it with sendText
      // to avoid two user messages in a row.
      const lastHistoryUser = historyParts.pop();
      sendText = `${lastHistoryUser?.parts[0].text}\n\n${lastMessage.content}`;
    }

    // Try models in order
    let lastError = '';
    for (const modelName of MODELS) {
      try {
        console.log(`[NX] Trying model: ${modelName}, history: ${historyParts.length}`);

        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 4000,
            topP: 0.9,
          },
        });

        const chat = model.startChat({ history: historyParts });
        const result = await chat.sendMessage(sendText);
        const text = result.response.text();

        console.log(`[NX] Success with model: ${modelName}`);
        return NextResponse.json({ response: text });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[NX] Model ${modelName} failed:`, msg.slice(0, 120));
        lastError = msg;

        // If quota exhausted on this key, no point trying other models
        if (msg.includes('API_KEY_INVALID') || msg.includes('PERMISSION_DENIED')) {
          break;
        }
        // 404 = model not found, try next
        // 429 = quota, try next model
        // otherwise continue
      }
    }

    // All models failed
    const isQuota = lastError.includes('429') || lastError.includes('quota');
    const isInvalidKey = lastError.includes('API_KEY_INVALID') || lastError.includes('PERMISSION_DENIED');

    let userMessage = 'Signal lost.';
    if (isQuota) userMessage = 'Quota limit reached. The system requires a moment.';
    if (isInvalidKey) userMessage = 'Invalid credentials. The connection is severed.';

    return NextResponse.json({ error: userMessage }, { status: 500 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[NX API Error]', message);
    return NextResponse.json({ error: 'Signal lost.' }, { status: 500 });
  }
}
