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

  it('_count.activePanicEvents excludes RESOLVED panics', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    await prisma.panicEvent.createMany({
      data: [
        { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'active-idem-1', partnerId: source.id, status: 'PENDING' },
        { externalUserId: 'u2', latitude: 0, longitude: 0, idempotencyKey: 'active-idem-2', partnerId: source.id, status: 'DISPATCHED' },
        { externalUserId: 'u3', latitude: 0, longitude: 0, idempotencyKey: 'active-idem-3', partnerId: source.id, status: 'RESOLVED' },
      ],
    })
    const res = await app.inject({ method: 'GET', url: '/api/v1/partners', headers: { authorization: `Bearer ${token}` } })
    const body = res.json<{ data: { id: string; _count: { panicEvents: number; activePanicEvents: number } }[] }>()
    const partner = body.data.find((p) => p.id === source.id)
    expect(partner?._count.activePanicEvents).toBe(2)
    expect(partner?._count.panicEvents).toBe(3)
  })

  it('filters by type when type query param is provided', async () => {
    const app = await createApp()
    const token = await getToken()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partners?type=PANIC_SOURCE',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { type: string }[] }>()
    expect(body.data.length).toBeGreaterThan(0)
    for (const partner of body.data) {
      expect(partner.type).toBe('PANIC_SOURCE')
    }
  })

  it('does not include apiKeyHash on any partner in the response', async () => {
    const app = await createApp()
    const token = await getToken()
    const res = await app.inject({ method: 'GET', url: '/api/v1/partners', headers: { authorization: `Bearer ${token}` } })
    const body = res.json<{ data: Record<string, unknown>[] }>()
    for (const partner of body.data) {
      expect(partner).not.toHaveProperty('apiKeyHash')
    }
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
