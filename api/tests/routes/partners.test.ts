import { createApp } from '../../src/app.js'
import prisma from '../../src/lib/prisma.js'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('GET /api/v1/partners', () => {
  afterEach(async () => {
    await prisma.panicEvent.deleteMany()
  })

  async function getToken() {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@oderply.com', password: 'Admin1234!' },
    })
    return res.json<{ token: string }>().token
  }

  it('returns 401 when JWT is missing', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/api/v1/partners' })
    expect(res.statusCode).toBe(401)
  })
})
