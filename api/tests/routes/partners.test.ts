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

  it('returns paginated list with _count.panicEvents on each partner', async () => {
    const app = await createApp()
    const token = await getToken()
    const res = await app.inject({ method: 'GET', url: '/api/v1/partners', headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { _count: { panicEvents: number } }[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>()
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)
    expect(typeof body.pagination.page).toBe('number')
    expect(typeof body.pagination.total).toBe('number')
    for (const partner of body.data) {
      expect(typeof partner._count.panicEvents).toBe('number')
    }
  })
})
