import type { FastifyInstance } from 'fastify'

export function panicRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/panics', async (_request, reply) => {
    return reply.code(501).send()
  })
}
