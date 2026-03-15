import type { FastifyInstance } from 'fastify'

import { apiKeyGuard } from '../hooks/apiKeyGuard.js'

export function panicRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/api/v1/panics',
    { preHandler: apiKeyGuard('PANIC_SOURCE') },
    async (_request, reply) => {
      return reply.code(501).send()
    },
  )
}
