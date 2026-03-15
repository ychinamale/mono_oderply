import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { Prisma } from '../generated/prisma/client.js'
import { apiKeyGuard } from '../hooks/apiKeyGuard.js'
import prisma from '../lib/prisma.js'

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

      const { externalUserId, latitude, longitude, idempotencyKey, metadata } = result.data

      try {
        const panic = await prisma.panicEvent.create({
          data: {
            externalUserId,
            latitude,
            longitude,
            idempotencyKey,
            metadata: metadata !== undefined ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
            partnerId: request.partner.id,
          },
          include: { partner: { omit: { apiKeyHash: true } } },
        })

        return reply.code(201).send(panic)
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          const existing = await prisma.panicEvent.findUnique({
            where: { idempotencyKey },
            include: { partner: { omit: { apiKeyHash: true } } },
          })
          return reply.code(200).send(existing)
        }
        throw err
      }
    },
  )
}
