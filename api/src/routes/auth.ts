import type { FastifyInstance } from 'fastify'

import prisma from '../lib/prisma.js'

export function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/login', async (request, reply) => {
    const { email } = request.body as { email: string }
    const operator = await prisma.operator.findUnique({ where: { email } })
    if (!operator) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }
    return reply.code(501).send()
  })
}
