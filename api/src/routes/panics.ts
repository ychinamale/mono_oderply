import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import * as Prisma from '../generated/prisma/internal/prismaNamespace.js'
import { apiKeyGuard } from '../hooks/apiKeyGuard.js'
import { jwtGuard } from '../hooks/jwtGuard.js'
import { assertTransition } from '../lib/assertTransition.js'
import { getIo } from '../lib/gateway.js'
import prisma from '../lib/prisma.js'
import { webhookQueue } from '../lib/webhookQueue.js'

const listPanicsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED']).optional(),
  partnerId: z.string().optional(),
})

const createPanicSchema = z.object({
  externalUserId: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  idempotencyKey: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export function panicRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/api/v1/panics',
    { preHandler: jwtGuard() },
    async (request, reply) => {
      const parsed = listPanicsQuerySchema.safeParse(request.query)
      if (!parsed.success) return reply.code(400).send({ error: 'Invalid query params' })
      const { page, limit, status, partnerId } = parsed.data
      const where = {
        ...(status ? { status } : {}),
        ...(partnerId ? { partnerId } : {}),
      }
      const [data, total] = await Promise.all([
        prisma.panicEvent.findMany({ where, skip: (page - 1) * limit, take: limit, include: { partner: { omit: { apiKeyHash: true } } } }),
        prisma.panicEvent.count({ where }),
      ])
      return reply.code(200).send({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
    },
  )

  fastify.get(
    '/api/v1/panics/:id',
    { preHandler: jwtGuard() },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const panic = await prisma.panicEvent.findUnique({
        where: { id },
        include: {
          partner: { omit: { apiKeyHash: true } },
          claimedByPartner: { omit: { apiKeyHash: true } },
        },
      })
      if (!panic) return reply.code(404).send({ error: 'Panic not found' })
      return reply.code(200).send(panic)
    },
  )

  fastify.post(
    '/api/v1/panics/:id/acknowledge',
    { preHandler: jwtGuard() },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const panic = await prisma.panicEvent.findUnique({ where: { id }, select: { id: true, status: true } })
      if (!panic) return reply.code(404).send({ error: 'Panic not found' })
      try { assertTransition(panic.status, 'PENDING', 'acknowledge') } catch (err) {
        return reply.code(400).send({ error: (err as Error).message })
      }

      const updated = await prisma.$transaction(async (tx) => {
        return tx.panicEvent.update({
          where: { id },
          data: {
            status: 'ACKNOWLEDGED',
            logs: {
              create: {
                triggeredBy: 'OPERATOR',
                operatorId: request.operator.operatorId,
                fromStatus: 'PENDING',
                toStatus: 'ACKNOWLEDGED',
              },
            },
          },
          include: {
            partner: { omit: { apiKeyHash: true } },
            claimedByPartner: { omit: { apiKeyHash: true } },
          },
        })
      })

      const panicSource = await prisma.partner.findUnique({ where: { id: updated.partnerId }, select: { webhookUrl: true } })
      if (panicSource?.webhookUrl) {
        webhookQueue.enqueue({ url: panicSource.webhookUrl, payload: { event: 'panic.status_updated', panic: updated } })
      }

      getIo()?.emit('panic:updated', updated)

      return reply.code(200).send(updated)
    },
  )

  fastify.post(
    '/api/v1/panics/:id/dispatch',
    { preHandler: jwtGuard() },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const panic = await prisma.panicEvent.findUnique({ where: { id }, select: { id: true, status: true } })
      if (!panic) return reply.code(404).send({ error: 'Panic not found' })
      try { assertTransition(panic.status, 'ACKNOWLEDGED', 'dispatch') } catch (err) {
        return reply.code(400).send({ error: (err as Error).message })
      }

      const updated = await prisma.$transaction(async (tx) => {
        return tx.panicEvent.update({
          where: { id },
          data: {
            status: 'DISPATCHED',
            logs: {
              create: {
                triggeredBy: 'OPERATOR',
                operatorId: request.operator.operatorId,
                fromStatus: 'ACKNOWLEDGED',
                toStatus: 'DISPATCHED',
              },
            },
          },
          include: {
            partner: { omit: { apiKeyHash: true } },
            claimedByPartner: { omit: { apiKeyHash: true } },
          },
        })
      })

      const panicSource = await prisma.partner.findUnique({ where: { id: updated.partnerId }, select: { webhookUrl: true } })
      if (panicSource?.webhookUrl) {
        webhookQueue.enqueue({ url: panicSource.webhookUrl, payload: { event: 'panic.status_updated', panic: updated } })
      }
      if (updated.claimedByPartnerId) {
        const responder = await prisma.partner.findUnique({ where: { id: updated.claimedByPartnerId }, select: { webhookUrl: true } })
        if (responder?.webhookUrl) {
          webhookQueue.enqueue({ url: responder.webhookUrl, payload: { event: 'panic.status_updated', panic: updated } })
        }
      }

      getIo()?.emit('panic:updated', updated)

      return reply.code(200).send(updated)
    },
  )

  fastify.post(
    '/api/v1/panics/:id/resolve',
    { preHandler: jwtGuard() },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const panic = await prisma.panicEvent.findUnique({ where: { id }, select: { id: true, status: true } })
      if (!panic) return reply.code(404).send({ error: 'Panic not found' })
      try { assertTransition(panic.status, 'DISPATCHED', 'resolve') } catch (err) {
        return reply.code(400).send({ error: (err as Error).message })
      }

      const updated = await prisma.$transaction(async (tx) => {
        return tx.panicEvent.update({
          where: { id },
          data: {
            status: 'RESOLVED',
            logs: {
              create: {
                triggeredBy: 'OPERATOR',
                operatorId: request.operator.operatorId,
                fromStatus: 'DISPATCHED',
                toStatus: 'RESOLVED',
              },
            },
          },
          include: {
            partner: { omit: { apiKeyHash: true } },
            claimedByPartner: { omit: { apiKeyHash: true } },
          },
        })
      })

      const panicSource = await prisma.partner.findUnique({ where: { id: updated.partnerId }, select: { webhookUrl: true } })
      if (panicSource?.webhookUrl) {
        webhookQueue.enqueue({ url: panicSource.webhookUrl, payload: { event: 'panic.status_updated', panic: updated } })
      }
      if (updated.claimedByPartnerId) {
        const responder = await prisma.partner.findUnique({ where: { id: updated.claimedByPartnerId }, select: { webhookUrl: true } })
        if (responder?.webhookUrl) {
          webhookQueue.enqueue({ url: responder.webhookUrl, payload: { event: 'panic.status_updated', panic: updated } })
        }
      }

      getIo()?.emit('panic:updated', updated)

      return reply.code(200).send(updated)
    },
  )

  fastify.post(
    '/api/v1/panics/:id/claim',
    { preHandler: apiKeyGuard('RESPONDER_SYSTEM') },
    async (request, reply) => {
      const { id } = request.params as { id: string }

      const exists = await prisma.panicEvent.findUnique({ where: { id }, select: { id: true } })
      if (!exists) return reply.code(404).send({ error: 'Panic not found' })

      type ClaimResult = { panic: Awaited<ReturnType<typeof prisma.panicEvent.update>>; error?: never } | { error: { code: number; message: string }; panic?: never }

      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<ClaimResult> => {
        const rows = await tx.$queryRaw<{ claimedByPartnerId: string | null; status: string }[]>`
          SELECT "claimedByPartnerId", status FROM "PanicEvent" WHERE id = ${id} FOR UPDATE
        `
        const locked = rows[0]

        if (locked.claimedByPartnerId) return { error: { code: 409, message: 'Panic already claimed' } }
        if (locked.status !== 'PENDING') return { error: { code: 400, message: 'Cannot claim a panic with status ' + locked.status } }

        const panic = await tx.panicEvent.update({
          where: { id },
          data: {
            status: 'ACKNOWLEDGED',
            claimedByPartnerId: request.partner.id,
            logs: {
              create: {
                triggeredBy: 'PARTNER_CLAIM',
                partnerId: request.partner.id,
                fromStatus: 'PENDING',
                toStatus: 'ACKNOWLEDGED',
              },
            },
          },
          include: {
            partner: { omit: { apiKeyHash: true } },
            claimedByPartner: { omit: { apiKeyHash: true } },
          },
        })

        return { panic }
      })

      if (result.error) return reply.code(result.error.code).send({ error: result.error.message })

      const panicSource = await prisma.partner.findUnique({ where: { id: result.panic.partnerId }, select: { webhookUrl: true } })
      if (panicSource?.webhookUrl) {
        webhookQueue.enqueue({ url: panicSource.webhookUrl, payload: { event: 'panic.status_updated', panic: result.panic } })
      }

      getIo()?.emit('panic:updated', result.panic)

      return reply.code(200).send(result.panic)
    },
  )

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

        const responders = await prisma.partner.findMany({
          where: { type: 'RESPONDER_SYSTEM', webhookUrl: { not: null } },
          select: { webhookUrl: true },
        })

        for (const responder of responders) {
          webhookQueue.enqueue({ url: responder.webhookUrl!, payload: { event: 'panic.created', panic } })
        }

        getIo()?.emit('panic:new', panic)

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
