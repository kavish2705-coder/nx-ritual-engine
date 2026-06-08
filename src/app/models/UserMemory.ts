import mongoose, { Schema } from 'mongoose';

const MessageSchema = new Schema({
  role: { type: String, enum: ['user', 'nx'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Number, default: Date.now }
});

const SessionTelemetrySchema = new Schema({
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

const SessionSchema = new Schema({
  id: { type: String, required: true },
  startedAt: { type: Number, required: true },
  endedAt: { type: Number },
  messages: [MessageSchema],
  patterns: [String],
  summary: { type: String },
  session_telemetry: { type: SessionTelemetrySchema }
});

const TraitModelSchema = new Schema({
  avoidance: { type: Number, default: 0 },
  overthinking: { type: Number, default: 0 },
  inconsistency: { type: Number, default: 0 },
  stressResponse: { type: Number, default: 0 }
});

const BehavioralPatternSchema = new Schema({
  name: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  lastUpdated: { type: Number, required: true }
});

const DiscrepancySchema = new Schema({
  claim: { type: String, required: true },
  observed: { type: String, required: true },
  occurrences: { type: Number, default: 1 }
});

const UserMemorySchema = new Schema({
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

export default UserMemory;
export type IUserMemory = mongoose.InferSchemaType<typeof UserMemorySchema>;
export type ISession = mongoose.InferSchemaType<typeof SessionSchema>;
export type IMessage = mongoose.InferSchemaType<typeof MessageSchema>;
