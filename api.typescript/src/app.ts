import 'dotenv/config'

import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import scalarApiReference from '@scalar/fastify-api-reference'
import Fastify from 'fastify'

import { attachGateway } from './lib/gateway.js'
import { authRoutes } from './routes/auth.js'
import { panicRoutes } from './routes/panics.js'
import { partnerRoutes } from './routes/partners.js'
import type { OperatorPayload } from './types/fastify.js'

export async function createApp() {
  const app = Fastify({ logger: false })

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'ODERP-ly API',
        version: '1.0.0',
        description: 'On-Demand Emergency Response Platform API',
        contact: { name: 'ODERP-ly Team' },
      },
      components: {
        securitySchemes: {
          ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'x-api-key' },
          BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })

  await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'test-secret' })
  await app.register(authRoutes)
  await app.register(panicRoutes)
  await app.register(partnerRoutes)

  await app.register(scalarApiReference, { routePrefix: '/docs' })

  app.get('/health', () => ({ status: 'ok' }))

  app.addHook('onReady', () => {
    const io = attachGateway(app.server)
    io.use((socket, next) => {
      const token = socket.handshake.auth.token as string | undefined
      if (!token) return next(new Error('Unauthorised'))
      try {
        const payload = app.jwt.verify<OperatorPayload>(token)
        ;(socket.data as { operator: OperatorPayload }).operator = payload
        next()
      } catch {
        next(new Error('Unauthorised'))
      }
    })
  })

  return app
}
