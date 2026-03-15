import type { FastifyReply, FastifyRequest } from 'fastify'

import type { OperatorPayload } from '../types/fastify.js'

export function jwtGuard() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
      request.operator = request.user as OperatorPayload
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  }
}
