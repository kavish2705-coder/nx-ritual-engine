import { z } from 'zod';

export const nxRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'nx', 'system', 'assistant']),
      content: z.string().max(10000, "Message content is too long")
    })
  ).max(50, "Too many messages"),
  systemPrompt: z.string().max(5000, "System prompt is too long")
});

export const analyzeRequestSchema = z.object({
  userId: z.string().min(1, "UserId is required").max(100, "UserId is too long"),
  session: z.object({
    id: z.string(),
    startedAt: z.number(),
    messages: z.array(
      z.object({
        role: z.enum(['user', 'nx', 'system', 'assistant']),
        content: z.string().max(10000, "Message content is too long")
      })
    ).min(1, "Valid session telemetry required").max(50, "Too many messages")
  })
});

export const memoryPostSchema = z.object({
  userId: z.string().min(1, "userId required").max(100, "userId is too long")
}).passthrough(); // allows other fields since it's an upsert with variable traits
