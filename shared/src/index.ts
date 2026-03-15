import { z } from 'zod'

export const PanicCreatedPayloadSchema = z.object({
  event: z.literal('panic.created'),
  panic: z.unknown(),
})

export const PanicStatusUpdatedPayloadSchema = z.object({
  event: z.literal('panic.status_updated'),
  panic: z.unknown(),
})

export const WebhookPayloadSchema = z.discriminatedUnion('event', [
  PanicCreatedPayloadSchema,
  PanicStatusUpdatedPayloadSchema,
])

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>

export const PanicStatus = {
  PENDING: 'PENDING',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  DISPATCHED: 'DISPATCHED',
  RESOLVED: 'RESOLVED',
} as const;

export type PanicStatus = (typeof PanicStatus)[keyof typeof PanicStatus];
