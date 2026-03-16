import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { jwtGuard } from '../hooks/jwtGuard.js'
import prisma from '../lib/prisma.js'

const partnerWithCount = {
  type: 'object',
  additionalProperties: true,
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    type: { type: 'string', enum: ['PANIC_SOURCE', 'RESPONDER_SYSTEM'] },
    webhookUrl: { type: 'string', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    _count: {
      type: 'object',
      properties: {
        panicEvents: { type: 'integer' },
        activePanicEvents: { type: 'integer' },
      },
    },
  },
} as const

const errorResponse = {
  type: 'object',
  properties: { error: { type: 'string' } },
} as const

const listPartnersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['PANIC_SOURCE', 'RESPONDER_SYSTEM']).optional(),
})

export function partnerRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/partners', {
    preHandler: jwtGuard(),
    schema: {
      tags: ['Partners'],
      summary: 'List partners (paginated)',
      security: [{ BearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          type: { type: 'string', enum: ['PANIC_SOURCE', 'RESPONDER_SYSTEM'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: { type: 'array', items: partnerWithCount },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
        400: errorResponse,
      },
    },
  }, async (req, reply) => {
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

  fastify.get('/api/v1/partners/:id', {
    preHandler: jwtGuard(),
    schema: {
      tags: ['Partners'],
      summary: 'Get a partner by ID',
      security: [{ BearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } } },
      response: { 200: partnerWithCount, 404: errorResponse },
    },
  }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const [partner, activePanicEvents] = await Promise.all([
      prisma.partner.findUnique({
        where: { id },
        omit: { apiKeyHash: true },
        include: { _count: { select: { panicEvents: true } } },
      }),
      prisma.panicEvent.count({
        where: { partnerId: id, status: { in: ['PENDING', 'ACKNOWLEDGED', 'DISPATCHED'] } },
      }),
    ])
    if (!partner) return reply.code(404).send({ error: 'Partner not found' })
    return reply.send({
      ...partner,
      _count: { panicEvents: partner._count.panicEvents, activePanicEvents },
    })
  })
}
