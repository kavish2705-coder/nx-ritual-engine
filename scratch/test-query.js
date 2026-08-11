const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8');
const matches = envFile.match(/^MONGODB_URI=(.*)$/m);
const MONGODB_URI = matches ? matches[1].trim() : null;

// Mock schemas
const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'nx'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Number, default: Date.now }
});
const SessionTelemetrySchema = new mongoose.Schema({
  trait_metrics: {
    avoidance_index: { type: Number, required: true },
    overthinking_index: { type: Number, default: 0 },
    inconsistency_index: { type: Number, default: 0 },
    stress_response_index: { type: Number, default: 0 },
    stress_response_profile: { type: String }
  },
  behavioral_patterns: [{
    pattern_id: { type: String, required: true },
    evidence: { type: String, required: true }
  }],
  cognitive_dissonance_matrix: {
    dissonance_detected: { type: Boolean, required: true },
    analysis: { type: String, required: true }
  }
}, { _id: false });
const SessionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  startedAt: { type: Number, required: true },
  endedAt: { type: Number },
  messages: [MessageSchema],
  patterns: [String],
  summary: { type: String },
  session_telemetry: { type: SessionTelemetrySchema }
});
const TraitModelSchema = new mongoose.Schema({
  avoidance: { type: Number, default: 0 },
  overthinking: { type: Number, default: 0 },
  inconsistency: { type: Number, default: 0 },
  stressResponse: { type: Number, default: 0 }
});
const BehavioralPatternSchema = new mongoose.Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  lastUpdated: { type: Number, required: true }
});
const DiscrepancySchema = new mongoose.Schema({
  claim: { type: String, required: true },
  observed: { type: String, required: true },
  occurrences: { type: Number, default: 1 }
});
const UserMemorySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  sessions: { type: [SessionSchema], default: [] },
  traits: {
    type: TraitModelSchema,
    default: () => ({ avoidance: 0, overthinking: 0, inconsistency: 0, stressResponse: 0 })
  },
  totalEntries: { type: Number, default: 0 },
  lastActive: { type: Number, default: Date.now },
  flameState: {
    type: String,
    enum: ['stable', 'flicker', 'bright', 'dim', 'idle', 'ignition', 'active', 'unstable', 'extinguished'],
    default: 'stable'
  },
  sessionCount: { type: Number, default: 0 },
  patterns: { type: [String], default: [] },
  behavioralPatterns: { type: [BehavioralPatternSchema], default: [] },
  discrepancyLog: { type: [DiscrepancySchema], default: [] },
  knownFacts: { type: [String], default: [] }
}, {
  timestamps: true
});

const UserMemory = mongoose.models.UserMemory || mongoose.model('UserMemory', UserMemorySchema);

async function run() {
  try {
    console.log('Connecting...');
    await mongoose.connect(MONGODB_URI, { bufferCommands: false });
    console.log('Connected!');

    const userId = "Kavish";
    console.log(`Searching for ${userId}...`);
    const user = await UserMemory.findOne({
      userId: { $regex: new RegExp(`^${userId}$`, 'i') }
    });
    console.log('User query result:', user);
  } catch (err) {
    console.error('Query Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
