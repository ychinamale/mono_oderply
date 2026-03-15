import type { FastifyInstance } from 'fastify'

export function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/auth/login', (req, reply) => {
    void req
    return reply.code(501).send()
  })
}
