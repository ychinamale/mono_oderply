import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { apiKeyGuard } from '../hooks/apiKeyGuard.js'

const createPanicSchema = z.object({
  externalUserId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  idempotencyKey: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export function panicRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/panics',
    { preHandler: apiKeyGuard('PANIC_SOURCE') },
    async (request, reply) => {
      const result = createPanicSchema.safeParse(request.body)
      if (!result.success) {
        return reply.code(400).send({ error: 'Invalid request body' })
      }
      return reply.code(501).send()
    },
  )
}
