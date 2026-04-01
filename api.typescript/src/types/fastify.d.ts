import type { Partner } from '../generated/prisma/client.js'

export type OperatorPayload = {
  operatorId: string
  email: string
  name: string
}

declare module 'fastify' {
  interface FastifyRequest {
    partner: Partner
    operator: OperatorPayload
  }
}
