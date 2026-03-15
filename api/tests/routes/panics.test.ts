import { createApp } from '../../src/app.js'
import prisma from '../../src/lib/prisma.js'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /api/v1/panics', () => {
  it('returns 401 when x-api-key header is missing', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'POST', url: '/api/v1/panics' })
    expect(res.statusCode).toBe(401)
  })

  const validBody = {
    externalUserId: 'user-123',
    latitude: -26.1052,
    longitude: 28.056,
    idempotencyKey: '550e8400-e29b-41d4-a716-446655440000',
  }

  const psHeaders = { 'x-api-key': 'ps-test-api-key-001' }

  it('returns 403 when API key belongs to a RESPONDER_SYSTEM partner', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: { 'x-api-key': 'rs-test-api-key-001' },
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when externalUserId is missing', async () => {
    const app = await createApp()
    const { externalUserId: _omit, ...body } = validBody
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: psHeaders,
      payload: body,
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when latitude is missing', async () => {
    const app = await createApp()
    const { latitude: _omit, ...body } = validBody
    const res = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: body })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when longitude is missing', async () => {
    const app = await createApp()
    const { longitude: _omit, ...body } = validBody
    const res = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: body })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when idempotencyKey is missing', async () => {
    const app = await createApp()
    const { idempotencyKey: _omit, ...body } = validBody
    const res = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: body })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when latitude is out of range (e.g. 91)', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: psHeaders,
      payload: { ...validBody, latitude: 91 },
    })
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when longitude is out of range (e.g. -181)', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: psHeaders,
      payload: { ...validBody, longitude: -181 },
    })
    expect(res.statusCode).toBe(400)
  })

  afterEach(async () => {
    await prisma.panicEvent.deleteMany()
  })

  it('returns 201 with the created PanicEvent on valid request', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: psHeaders,
      payload: validBody,
    })
    expect(res.statusCode).toBe(201)
  })

  it('created PanicEvent has status PENDING', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    expect(res.json<{ status: string }>().status).toBe('PENDING')
  })

  it('created PanicEvent has partnerId matching the authenticated partner', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    const body = res.json<{ partnerId: string; partner: { name: string } }>()
    expect(body.partner.name).toBe('Test Panic Source')
  })

  it('response includes partner object inline — not just partnerId', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    const body = res.json<{ partner: unknown }>()
    expect(body.partner).toBeDefined()
    expect(typeof body.partner).toBe('object')
  })

  it('response does not include apiKeyHash on the inline partner', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    const body = res.json<{ partner: Record<string, unknown> }>()
    expect(body.partner.apiKeyHash).toBeUndefined()
  })
})
