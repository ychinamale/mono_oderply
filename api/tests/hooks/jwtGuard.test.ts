import jwt from '@fastify/jwt'
import Fastify from 'fastify'

import { createApp } from '../../src/app.js'
import { jwtGuard } from '../../src/hooks/jwtGuard.js'
import prisma from '../../src/lib/prisma.js'

async function buildGuardApp() {
  const app = await createApp()
  app.get('/protected', { preHandler: jwtGuard() }, (req, reply) => {
    reply.send({ operatorId: req.operator.operatorId })
  })
  return app
}

afterAll(async () => {
  await prisma.$disconnect()
})

describe('jwtGuard', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const app = await buildGuardApp()
    const res = await app.inject({ method: 'GET', url: '/protected' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when Authorization header is present but token is malformed', async () => {
    const app = await buildGuardApp()
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: 'Bearer not.a.jwt' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when token is expired', async () => {
    const signer = Fastify()
    await signer.register(jwt, { secret: 'test-secret' })
    const token = signer.jwt.sign({ operatorId: 'x', email: 'x@x.com', name: 'X' }, { expiresIn: -1 })

    const app = await buildGuardApp()
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(401)
  })

  it('attaches decoded operator payload to request.operator on valid token', async () => {
    const app = await buildGuardApp()
    const token = app.jwt.sign({ operatorId: 'op-123', email: 'op@example.com', name: 'Op' })

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ operatorId: string }>().operatorId).toBe('op-123')
  })

  it('allows request to proceed to route handler when token is valid', async () => {
    const app = await buildGuardApp()
    const token = app.jwt.sign({ operatorId: 'op-456', email: 'op@example.com', name: 'Op' })

    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it('returns 401 when token is signed with a different secret', async () => {
    const signer = Fastify()
    await signer.register(jwt, { secret: 'wrong-secret' })
    const token = signer.jwt.sign({ operatorId: 'x', email: 'x@x.com', name: 'X' })

    const app = await buildGuardApp()
    const res = await app.inject({
      method: 'GET',
      url: '/protected',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(401)
  })
})
