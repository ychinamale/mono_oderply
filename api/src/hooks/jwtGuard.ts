import type { FastifyReply, FastifyRequest } from 'fastify'

export function jwtGuard() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    void request
    void reply
  }
}
