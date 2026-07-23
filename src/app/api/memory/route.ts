import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '../../lib/mongodb';
import UserMemory from '../../models/UserMemory';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim();

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    await connectToDatabase();

    // Case-insensitive user lookup
    const escapedUserId = userId.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const user = await UserMemory.findOne({
      userId: { $regex: new RegExp(`^${escapedUserId}$`, 'i') }
    });

    if (!user) {
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({ exists: true, data: user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API Memory GET Error]', message);
    return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId?.trim();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const { userId: _, ...updateFields } = body;

    await connectToDatabase();

    const defaultFields = {
      sessions: [],
      traits: { avoidance: 0, overthinking: 0, inconsistency: 0, stressResponse: 0 },
      totalEntries: 0,
      flameState: 'stable',
      sessionCount: 0,
      patterns: [],
      behavioralPatterns: [],
      discrepancyLog: [],
      knownFacts: []
    };

    const setOnInsertObj: any = { userId };
    const setObj: any = {
      ...updateFields,
      lastActive: Date.now()
    };

    // Prevent key overlap between $setOnInsert and $set
    for (const [key, val] of Object.entries(defaultFields)) {
      if (!(key in setObj)) {
        setOnInsertObj[key] = val;
      }
    }

    // Atomic upsert prevents concurrent double-creation race conditions
    const escapedUserId = userId.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const user = await UserMemory.findOneAndUpdate(
      { userId: { $regex: new RegExp(`^${escapedUserId}$`, 'i') } },
      {
        $setOnInsert: setOnInsertObj,
        $set: setObj
      },
      { upsert: true, returnDocument: 'after', runValidators: true }
    );

    return NextResponse.json({ success: true, data: user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API Memory POST Error]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId')?.trim();

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    await connectToDatabase();

    const escapedUserId = userId.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');
    const result = await UserMemory.deleteOne({
      userId: { $regex: new RegExp(`^${escapedUserId}$`, 'i') }
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User telemetry purged' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[API Memory DELETE Error]', message);
    return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
  }
}
