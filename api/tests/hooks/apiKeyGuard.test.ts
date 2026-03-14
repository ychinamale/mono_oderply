import Fastify from 'fastify'

import { apiKeyGuard } from '../../src/hooks/apiKeyGuard.js'
import prisma from '../../src/lib/prisma.js'

function buildApp(requiredType?: 'PANIC_SOURCE' | 'RESPONDER_SYSTEM') {
  const app = Fastify({ logger: false })
  app.get(
    '/test',
    { preHandler: apiKeyGuard(requiredType) },
    (req, reply) => {
      reply.send({
        partnerId: req.partner.id,
        partnerName: req.partner.name,
        partnerType: req.partner.type,
      })
    },
  )
  return app
}

afterAll(async () => {
  await prisma.$disconnect()
})

describe('apiKeyGuard', () => {
  it('returns 401 when x-api-key header is missing', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(401)
  })
})
