import 'dotenv/config'

import jwt from '@fastify/jwt'
import Fastify from 'fastify'

import { attachGateway } from './lib/gateway.js'
import { authRoutes } from './routes/auth.js'
import { panicRoutes } from './routes/panics.js'
import type { OperatorPayload } from './types/fastify.js'

export async function createApp() {
  const app = Fastify({ logger: false })

  await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'test-secret' })
  await app.register(authRoutes)
  await app.register(panicRoutes)

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
