import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { jwtGuard } from '../hooks/jwtGuard.js'
import prisma from '../lib/prisma.js'

const listPartnersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['PANIC_SOURCE', 'RESPONDER_SYSTEM']).optional(),
})

export function partnerRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/partners', { preHandler: jwtGuard() }, async (req, reply) => {
    const parsed = listPartnersQuerySchema.safeParse(req.query)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid query params' })

    const { page, limit, type } = parsed.data
    const where = type ? { type } : {}

    const [partners, total, activeCounts] = await Promise.all([
      prisma.partner.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        omit: { apiKeyHash: true },
        include: { _count: { select: { panicEvents: true } } },
      }),
      prisma.partner.count({ where }),
      prisma.panicEvent.groupBy({
        by: ['partnerId'],
        where: { status: { in: ['PENDING', 'ACKNOWLEDGED', 'DISPATCHED'] } },
        _count: { id: true },
      }),
    ])

    const activeByPartnerId = new Map(activeCounts.map((r) => [r.partnerId, r._count.id]))
    const data = partners.map((p) => ({
      ...p,
      _count: { panicEvents: p._count.panicEvents, activePanicEvents: activeByPartnerId.get(p.id) ?? 0 },
    }))

    return reply.send({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  })
}
