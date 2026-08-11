import { NextResponse } from 'next/server';

export async function GET() {
  // Tell the client whether a server-side API key is already configured
  const hasKey = !!process.env.GEMINI_API_KEY;
  return NextResponse.json({ configured: hasKey });
}
