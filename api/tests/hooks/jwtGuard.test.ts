import { createApp } from '../../src/app.js'
import { jwtGuard } from '../../src/hooks/jwtGuard.js'
import prisma from '../../src/lib/prisma.js'

function buildGuardApp() {
  return createApp().then((app) => {
    app.get('/protected', { preHandler: jwtGuard() }, (req, reply) => {
      reply.send({ operatorId: req.operator.operatorId })
    })
    return app
  })
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
})
