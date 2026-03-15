import bcrypt from 'bcrypt'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import prisma from '../lib/prisma.js'

const emailSchema = z.object({ email: z.email() })
const passwordSchema = z.object({ password: z.string().min(1) })

export function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/login', async (request, reply) => {
    const emailResult = emailSchema.safeParse(request.body)
    if (!emailResult.success) {
      return reply.code(400).send({ error: 'Invalid request body' })
    }
    const { email } = emailResult.data
    const passwordResult = passwordSchema.safeParse(request.body)
    if (!passwordResult.success) {
      return reply.code(400).send({ error: 'Invalid request body' })
    }
    const { password } = passwordResult.data
    const operator = await prisma.operator.findUnique({ where: { email } })
    if (!operator) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }
    const match = await bcrypt.compare(password, operator.passwordHash)
    if (!match) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }
    const token = fastify.jwt.sign({ operatorId: operator.id, email: operator.email, name: operator.name })
    return reply.code(200).send({ token, operator: { id: operator.id, name: operator.name, email: operator.email } })
  })
}
