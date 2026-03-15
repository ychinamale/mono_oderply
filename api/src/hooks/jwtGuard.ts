import type { FastifyReply, FastifyRequest } from 'fastify'

export function jwtGuard() {
  return (request: FastifyRequest, reply: FastifyReply) => {
    void request
    void reply
  }
}
