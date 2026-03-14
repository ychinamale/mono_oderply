import type { FastifyReply, FastifyRequest } from 'fastify'

import type { PartnerType } from '../generated/prisma/client.js'

export function apiKeyGuard(requiredType?: PartnerType) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    void requiredType
    void request
    void reply
  }
}
