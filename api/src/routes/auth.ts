import bcrypt from 'bcrypt'
import type { FastifyInstance } from 'fastify'

import prisma from '../lib/prisma.js'

export function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string }
    const operator = await prisma.operator.findUnique({ where: { email } })
    if (!operator) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }
    const match = await bcrypt.compare(password, operator.passwordHash)
    if (!match) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }
    return reply.code(501).send()
  })
}
