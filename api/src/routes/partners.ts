import type { FastifyInstance } from 'fastify'

import { jwtGuard } from '../hooks/jwtGuard.js'

export function partnerRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/partners', { preHandler: jwtGuard() }, async (_req, reply) => {
    return reply.code(501).send()
  })
}
