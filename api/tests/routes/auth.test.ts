import { createApp } from '../../src/app.js'
import prisma from '../../src/lib/prisma.js'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /api/auth/login', () => {
  it('returns 401 when email does not exist', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: 'irrelevant' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when password is incorrect', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@oderply.com', password: 'wrong-password' },
    })
    expect(res.statusCode).toBe(401)
  })
})
