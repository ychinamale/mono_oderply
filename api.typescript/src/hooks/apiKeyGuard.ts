import { createHash } from 'crypto'

import type { FastifyReply, FastifyRequest } from 'fastify'

import type { PartnerType } from '../generated/prisma/enums.js'
import prisma from '../lib/prisma.js'

export function apiKeyGuard(requiredType?: PartnerType) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const raw = request.headers['x-api-key']
    if (!raw) {
      return reply.code(401).send({ error: 'Missing x-api-key header' })
    }

    const hash = createHash('sha256').update(raw as string).digest('hex')
    const partner = await prisma.partner.findUnique({ where: { apiKeyHash: hash } })
    if (!partner) {
      return reply.code(403).send({ error: 'Invalid API key' })
    }

    if (requiredType && partner.type !== requiredType) {
      return reply
        .code(403)
        .send({ error: `This endpoint requires partner type ${requiredType}` })
    }

    request.partner = partner
  }
}
