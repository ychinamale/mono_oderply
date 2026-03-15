import 'dotenv/config'

import jwt from '@fastify/jwt'
import Fastify from 'fastify'

import { authRoutes } from './routes/auth.js'

export async function createApp() {
  const app = Fastify({ logger: false })

  await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'test-secret' })
  await app.register(authRoutes)

  app.get('/health', () => ({ status: 'ok' }))

  return app
}
