import type { Partner } from '../generated/prisma/client.js'

declare module 'fastify' {
  interface FastifyRequest {
    partner: Partner
  }
}
