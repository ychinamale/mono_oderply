import { jest } from '@jest/globals'

import { createApp } from '../../src/app.js'
import { webhookQueue, type WebhookJob } from '../../src/lib/webhookQueue.js'
import prisma from '../../src/lib/prisma.js'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /api/v1/panics', () => {
  // Prevent real HTTP calls from the webhook queue in every test
  let enqueueSpy: ReturnType<typeof jest.spyOn>
  beforeEach(() => {
    enqueueSpy = jest.spyOn(webhookQueue, 'enqueue').mockImplementation(() => {})
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await prisma.panicEvent.deleteMany()
  })

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

  it('metadata is stored and returned when provided', async () => {
    const app = await createApp()
    const meta = { emergencyType: 'medical', batteryLevel: 42 }
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: psHeaders,
      payload: { ...validBody, metadata: meta },
    })
    expect(res.json<{ metadata: unknown }>().metadata).toEqual(meta)
  })

  it('metadata is null when not provided', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    expect(res.json<{ metadata: unknown }>().metadata).toBeNull()
  })

  it('returns 200 with the original event when idempotencyKey is submitted a second time', async () => {
    const app = await createApp()
    const first = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    const second = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    expect(second.statusCode).toBe(200)
    expect(second.json<{ id: string }>().id).toBe(first.json<{ id: string }>().id)
  })

  it('does not create a second PanicEvent row on duplicate idempotencyKey', async () => {
    const app = await createApp()
    await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    const count = await prisma.panicEvent.count({ where: { idempotencyKey: validBody.idempotencyKey } })
    expect(count).toBe(1)
  })

  it('returns a different event for a different idempotencyKey', async () => {
    const app = await createApp()
    const first = await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: psHeaders,
      payload: { ...validBody, idempotencyKey: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
    })
    expect(second.statusCode).toBe(201)
    expect(second.json<{ id: string }>().id).not.toBe(first.json<{ id: string }>().id)
  })

  it('enqueues a broadcast to all RESPONDER_SYSTEM partners on panic creation', async () => {
    const app = await createApp()
    await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    const responderPartners = await prisma.partner.findMany({ where: { type: 'RESPONDER_SYSTEM', webhookUrl: { not: null } } })
    const enqueuedUrls = enqueueSpy.mock.calls.map((args: [WebhookJob]) => args[0].url)
    for (const partner of responderPartners) {
      expect(enqueuedUrls).toContain(partner.webhookUrl)
    }
  })

  it('does not enqueue a broadcast to PANIC_SOURCE partners on panic creation', async () => {
    const app = await createApp()
    await app.inject({ method: 'POST', url: '/api/v1/panics', headers: psHeaders, payload: validBody })
    const panicSourcePartners = await prisma.partner.findMany({ where: { type: 'PANIC_SOURCE' } })
    const enqueuedUrls = enqueueSpy.mock.calls.map((args: [WebhookJob]) => args[0].url)
    for (const partner of panicSourcePartners) {
      expect(enqueuedUrls).not.toContain(partner.webhookUrl)
    }
  })
})

describe('POST /api/v1/panics/:id/claim', () => {
  let enqueueSpy: ReturnType<typeof jest.spyOn>
  beforeEach(() => {
    enqueueSpy = jest.spyOn(webhookQueue, 'enqueue').mockImplementation(() => {})
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await prisma.panicEventLog.deleteMany()
    await prisma.panicEvent.deleteMany()
  })

  const rsHeaders = { 'x-api-key': 'rs-test-api-key-001' }
  const psHeaders = { 'x-api-key': 'ps-test-api-key-001' }

  it('returns 403 when API key belongs to a PANIC_SOURCE partner', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/panics/some-id/claim',
      headers: psHeaders,
    })
    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when panic id does not exist', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/panics/nonexistent-id/claim',
      headers: rsHeaders,
    })
    expect(res.statusCode).toBe(404)
  })

  async function createPanic(overrides: Record<string, unknown> = {}) {
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    return prisma.panicEvent.create({
      data: {
        externalUserId: 'user-test',
        latitude: -26.1,
        longitude: 28.0,
        idempotencyKey: `idem-${Date.now()}-${Math.random()}`,
        partnerId: source.id,
        ...overrides,
      },
    })
  }

  it('returns 409 when panic has already been claimed by another partner', async () => {
    const app = await createApp()
    const responder = await prisma.partner.findFirstOrThrow({ where: { type: 'RESPONDER_SYSTEM' } })
    const panic = await createPanic({ claimedByPartnerId: responder.id, status: 'ACKNOWLEDGED' })
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/claim`,
      headers: rsHeaders,
    })
    expect(res.statusCode).toBe(409)
  })

  it('returns 400 when panic status is not PENDING', async () => {
    const app = await createApp()
    for (const status of ['ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED'] as const) {
      const panic = await createPanic({ status })
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/panics/${panic.id}/claim`,
        headers: rsHeaders,
      })
      expect(res.statusCode).toBe(400)
    }
  })

  it('returns 200 on successful claim', async () => {
    const app = await createApp()
    const panic = await createPanic()
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/claim`,
      headers: rsHeaders,
    })
    expect(res.statusCode).toBe(200)
  })

  it('sets status to ACKNOWLEDGED after successful claim', async () => {
    const app = await createApp()
    const panic = await createPanic()
    const res = await app.inject({ method: 'POST', url: `/api/v1/panics/${panic.id}/claim`, headers: rsHeaders })
    expect(res.json<{ status: string }>().status).toBe('ACKNOWLEDGED')
  })

  it('sets claimedByPartnerId to the claiming partner after successful claim', async () => {
    const app = await createApp()
    const panic = await createPanic()
    const responder = await prisma.partner.findFirstOrThrow({ where: { type: 'RESPONDER_SYSTEM' } })
    const res = await app.inject({ method: 'POST', url: `/api/v1/panics/${panic.id}/claim`, headers: rsHeaders })
    expect(res.json<{ claimedByPartnerId: string }>().claimedByPartnerId).toBe(responder.id)
  })

  it('creates a PanicEventLog entry with triggeredBy PARTNER_CLAIM', async () => {
    const app = await createApp()
    const panic = await createPanic()
    await app.inject({ method: 'POST', url: `/api/v1/panics/${panic.id}/claim`, headers: rsHeaders })
    const log = await prisma.panicEventLog.findFirst({ where: { panicId: panic.id } })
    expect(log?.triggeredBy).toBe('PARTNER_CLAIM')
  })

  it('PanicEventLog entry has partnerId set and operatorId null', async () => {
    const app = await createApp()
    const panic = await createPanic()
    const responder = await prisma.partner.findFirstOrThrow({ where: { type: 'RESPONDER_SYSTEM' } })
    await app.inject({ method: 'POST', url: `/api/v1/panics/${panic.id}/claim`, headers: rsHeaders })
    const log = await prisma.panicEventLog.findFirst({ where: { panicId: panic.id } })
    expect(log?.partnerId).toBe(responder.id)
    expect(log?.operatorId).toBeNull()
  })

  it('PanicEventLog entry records previousStatus as PENDING and newStatus as ACKNOWLEDGED', async () => {
    const app = await createApp()
    const panic = await createPanic()
    await app.inject({ method: 'POST', url: `/api/v1/panics/${panic.id}/claim`, headers: rsHeaders })
    const log = await prisma.panicEventLog.findFirst({ where: { panicId: panic.id } })
    expect(log?.fromStatus).toBe('PENDING')
    expect(log?.toStatus).toBe('ACKNOWLEDGED')
  })

  it('response includes claimedByPartner object inline', async () => {
    const app = await createApp()
    const panic = await createPanic()
    const res = await app.inject({ method: 'POST', url: `/api/v1/panics/${panic.id}/claim`, headers: rsHeaders })
    const body = res.json<{ claimedByPartner: Record<string, unknown> }>()
    expect(body.claimedByPartner).toBeDefined()
    expect(typeof body.claimedByPartner).toBe('object')
    expect(body.claimedByPartner.apiKeyHash).toBeUndefined()
  })

  it('enqueues a webhook to the PANIC_SOURCE partner after successful claim', async () => {
    const app = await createApp()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    await prisma.partner.update({ where: { id: source.id }, data: { webhookUrl: 'http://source.example.com/webhook' } })
    const panic = await createPanic()
    await app.inject({ method: 'POST', url: `/api/v1/panics/${panic.id}/claim`, headers: rsHeaders })
    const enqueuedUrls = (enqueueSpy.mock.calls as [{ url: string }][]).map((args) => args[0].url)
    expect(enqueuedUrls).toContain('http://source.example.com/webhook')
    await prisma.partner.update({ where: { id: source.id }, data: { webhookUrl: null } })
  })

  it('when two claims are submitted concurrently, exactly one succeeds and one receives 409', async () => {
    const app = await createApp()
    const panic = await createPanic()
    const [res1, res2] = await Promise.all([
      app.inject({ method: 'POST', url: `/api/v1/panics/${panic.id}/claim`, headers: rsHeaders }),
      app.inject({ method: 'POST', url: `/api/v1/panics/${panic.id}/claim`, headers: rsHeaders }),
    ])
    const statuses = [res1.statusCode, res2.statusCode].sort()
    expect(statuses).toEqual([200, 409])
    const logCount = await prisma.panicEventLog.count({ where: { panicId: panic.id } })
    expect(logCount).toBe(1)
    const updated = await prisma.panicEvent.findUniqueOrThrow({ where: { id: panic.id } })
    expect(updated.claimedByPartnerId).not.toBeNull()
  })
})

describe('POST /api/v1/panics/:id/acknowledge', () => {
  afterEach(async () => {
    await prisma.panicEventLog.deleteMany()
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

  async function createPanic(overrides: Record<string, unknown> = {}) {
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    return prisma.panicEvent.create({
      data: {
        externalUserId: 'user-test',
        latitude: -26.1,
        longitude: 28.0,
        idempotencyKey: `idem-${Date.now()}-${Math.random()}`,
        partnerId: source.id,
        ...overrides,
      },
    })
  }

  it('returns 401 when JWT is missing', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'POST', url: '/api/v1/panics/some-id/acknowledge' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when panic id does not exist', async () => {
    const app = await createApp()
    const token = await getToken()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/panics/nonexistent-id/acknowledge',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns 400 when panic status is not PENDING', async () => {
    const app = await createApp()
    const token = await getToken()
    for (const status of ['ACKNOWLEDGED', 'DISPATCHED', 'RESOLVED'] as const) {
      const panic = await createPanic({ status })
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/panics/${panic.id}/acknowledge`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(400)
    }
  })

  it('returns 200 and sets status to ACKNOWLEDGED', async () => {
    const app = await createApp()
    const token = await getToken()
    const panic = await createPanic()
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/acknowledge`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ status: string }>().status).toBe('ACKNOWLEDGED')
  })

  it('creates a PanicEventLog with triggeredBy OPERATOR and operatorId set', async () => {
    const app = await createApp()
    const token = await getToken()
    const panic = await createPanic()
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/acknowledge`,
      headers: { authorization: `Bearer ${token}` },
    })
    const log = await prisma.panicEventLog.findFirst({ where: { panicId: panic.id } })
    expect(log?.triggeredBy).toBe('OPERATOR')
    expect(log?.operatorId).not.toBeNull()
  })

  it('PanicEventLog has operatorId set and partnerId null', async () => {
    const app = await createApp()
    const token = await getToken()
    const panic = await createPanic()
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/acknowledge`,
      headers: { authorization: `Bearer ${token}` },
    })
    const log = await prisma.panicEventLog.findFirst({ where: { panicId: panic.id } })
    expect(log?.operatorId).not.toBeNull()
    expect(log?.partnerId).toBeNull()
  })

  it('response includes partner inline', async () => {
    const app = await createApp()
    const token = await getToken()
    const panic = await createPanic()
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/acknowledge`,
      headers: { authorization: `Bearer ${token}` },
    })
    const body = res.json<{ partner: unknown }>()
    expect(body.partner).toBeDefined()
    expect(typeof body.partner).toBe('object')
  })

  it('response does not include apiKeyHash on the inline partner', async () => {
    const app = await createApp()
    const token = await getToken()
    const panic = await createPanic()
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/acknowledge`,
      headers: { authorization: `Bearer ${token}` },
    })
    const body = res.json<{ partner: Record<string, unknown> }>()
    expect(body.partner.apiKeyHash).toBeUndefined()
  })

  it('400 error message follows "Cannot acknowledge a panic with status [currentStatus]" format', async () => {
    const app = await createApp()
    const token = await getToken()
    const panic = await createPanic({ status: 'ACKNOWLEDGED' })
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/acknowledge`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json<{ error: string }>().error).toBe('Cannot acknowledge a panic with status ACKNOWLEDGED')
  })
})

describe('POST /api/v1/panics/:id/dispatch', () => {
  afterEach(async () => {
    await prisma.panicEventLog.deleteMany()
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

  async function createPanic(overrides: Record<string, unknown> = {}) {
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    return prisma.panicEvent.create({
      data: {
        externalUserId: 'user-test',
        latitude: -26.1,
        longitude: 28.0,
        idempotencyKey: `idem-${Date.now()}-${Math.random()}`,
        partnerId: source.id,
        ...overrides,
      },
    })
  }

  it('returns 400 when panic status is not ACKNOWLEDGED', async () => {
    const app = await createApp()
    const token = await getToken()
    for (const status of ['PENDING', 'DISPATCHED', 'RESOLVED'] as const) {
      const panic = await createPanic({ status })
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/panics/${panic.id}/dispatch`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(400)
    }
  })

  it('returns 200 and sets status to DISPATCHED', async () => {
    const app = await createApp()
    const token = await getToken()
    const panic = await createPanic({ status: 'ACKNOWLEDGED' })
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/dispatch`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ status: string }>().status).toBe('DISPATCHED')
  })

  it('creates a PanicEventLog with triggeredBy OPERATOR', async () => {
    const app = await createApp()
    const token = await getToken()
    const panic = await createPanic({ status: 'ACKNOWLEDGED' })
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/dispatch`,
      headers: { authorization: `Bearer ${token}` },
    })
    const log = await prisma.panicEventLog.findFirst({ where: { panicId: panic.id } })
    expect(log?.triggeredBy).toBe('OPERATOR')
    expect(log?.operatorId).not.toBeNull()
    expect(log?.partnerId).toBeNull()
  })
})

describe('POST /api/v1/panics/:id/resolve', () => {
  afterEach(async () => {
    await prisma.panicEventLog.deleteMany()
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

  async function createPanic(overrides: Record<string, unknown> = {}) {
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    return prisma.panicEvent.create({
      data: {
        externalUserId: 'user-test',
        latitude: -26.1,
        longitude: 28.0,
        idempotencyKey: `idem-${Date.now()}-${Math.random()}`,
        partnerId: source.id,
        ...overrides,
      },
    })
  }

  it('returns 400 when panic status is not DISPATCHED', async () => {
    const app = await createApp()
    const token = await getToken()
    for (const status of ['PENDING', 'ACKNOWLEDGED', 'RESOLVED'] as const) {
      const panic = await createPanic({ status })
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/panics/${panic.id}/resolve`,
        headers: { authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(400)
    }
  })

  it('returns 200 and sets status to RESOLVED', async () => {
    const app = await createApp()
    const token = await getToken()
    const panic = await createPanic({ status: 'DISPATCHED' })
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/resolve`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json<{ status: string }>().status).toBe('RESOLVED')
  })

  it('creates a PanicEventLog with triggeredBy OPERATOR', async () => {
    const app = await createApp()
    const token = await getToken()
    const panic = await createPanic({ status: 'DISPATCHED' })
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/resolve`,
      headers: { authorization: `Bearer ${token}` },
    })
    const log = await prisma.panicEventLog.findFirst({ where: { panicId: panic.id } })
    expect(log?.triggeredBy).toBe('OPERATOR')
    expect(log?.operatorId).not.toBeNull()
    expect(log?.partnerId).toBeNull()
  })
})

describe('GET /api/v1/panics', () => {
  afterEach(async () => {
    await prisma.panicEventLog.deleteMany()
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
    const res = await app.inject({ method: 'GET', url: '/api/v1/panics' })
    expect(res.statusCode).toBe(401)
  })

  it('returns paginated results with data and pagination fields', async () => {
    const app = await createApp()
    const token = await getToken()
    const res = await app.inject({ method: 'GET', url: '/api/v1/panics', headers: { authorization: `Bearer ${token}` } })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>()
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.pagination.page).toBe('number')
    expect(typeof body.pagination.limit).toBe('number')
    expect(typeof body.pagination.total).toBe('number')
    expect(typeof body.pagination.totalPages).toBe('number')
  })

  it('pagination.total reflects the actual count of matching records', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    await prisma.panicEvent.createMany({
      data: [
        { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: `idem-total-1`, partnerId: source.id },
        { externalUserId: 'u2', latitude: 0, longitude: 0, idempotencyKey: `idem-total-2`, partnerId: source.id },
        { externalUserId: 'u3', latitude: 0, longitude: 0, idempotencyKey: `idem-total-3`, partnerId: source.id },
      ],
    })
    const res = await app.inject({ method: 'GET', url: '/api/v1/panics', headers: { authorization: `Bearer ${token}` } })
    const body = res.json<{ data: unknown[]; pagination: { total: number } }>()
    expect(body.pagination.total).toBe(3)
    expect(body.data).toHaveLength(3)
  })

  it('defaults to page 1 and limit 20 when query params are omitted', async () => {
    const app = await createApp()
    const token = await getToken()
    const res = await app.inject({ method: 'GET', url: '/api/v1/panics', headers: { authorization: `Bearer ${token}` } })
    const body = res.json<{ pagination: { page: number; limit: number } }>()
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(20)
  })

  it('filters by status when status query param is provided', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    await prisma.panicEvent.createMany({
      data: [
        { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: `idem-status-1`, partnerId: source.id, status: 'PENDING' },
        { externalUserId: 'u2', latitude: 0, longitude: 0, idempotencyKey: `idem-status-2`, partnerId: source.id, status: 'RESOLVED' },
      ],
    })
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/panics?status=PENDING',
      headers: { authorization: `Bearer ${token}` },
    })
    const body = res.json<{ data: { status: string }[]; pagination: { total: number } }>()
    expect(body.pagination.total).toBe(1)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].status).toBe('PENDING')
  })

  it('filters by partnerId when partnerId query param is provided', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const responder = await prisma.partner.findFirstOrThrow({ where: { type: 'RESPONDER_SYSTEM' } })
    await prisma.panicEvent.createMany({
      data: [
        { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: `idem-pid-1`, partnerId: source.id },
        { externalUserId: 'u2', latitude: 0, longitude: 0, idempotencyKey: `idem-pid-2`, partnerId: responder.id },
      ],
    })
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/panics?partnerId=${source.id}`,
      headers: { authorization: `Bearer ${token}` },
    })
    const body = res.json<{ data: { partnerId: string }[]; pagination: { total: number } }>()
    expect(body.pagination.total).toBe(1)
    expect(body.data).toHaveLength(1)
    expect(body.data[0].partnerId).toBe(source.id)
  })

  it('each panic in data includes partner inline', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: `idem-inline-1`, partnerId: source.id },
    })
    const res = await app.inject({ method: 'GET', url: '/api/v1/panics', headers: { authorization: `Bearer ${token}` } })
    const body = res.json<{ data: { partner: Record<string, unknown> }[] }>()
    expect(body.data[0].partner).toBeDefined()
    expect(typeof body.data[0].partner).toBe('object')
    expect(body.data[0].partner.id).toBe(source.id)
  })

  it('does not include apiKeyHash on any inline partner', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: `idem-nohash-1`, partnerId: source.id },
    })
    const res = await app.inject({ method: 'GET', url: '/api/v1/panics', headers: { authorization: `Bearer ${token}` } })
    const body = res.json<{ data: { partner: Record<string, unknown> }[] }>()
    expect(body.data[0].partner.apiKeyHash).toBeUndefined()
  })
})

describe('GET /api/v1/panics/:id', () => {
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
    const res = await app.inject({ method: 'GET', url: '/api/v1/panics/some-id' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when panic id does not exist', async () => {
    const app = await createApp()
    const token = await getToken()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/panics/00000000-0000-0000-0000-000000000000',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns the panic with partner and claimedByPartner inline', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const panic = await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'idem-get-by-id-1', partnerId: source.id },
    })
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/panics/${panic.id}`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<Record<string, unknown>>()
    expect(body.id).toBe(panic.id)
    expect(body.partner).toBeDefined()
    expect(body.claimedByPartner).toBeDefined()
  })

  it('claimedByPartner is null when panic has not been claimed', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const panic = await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'idem-unclaimed-1', partnerId: source.id },
    })
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/panics/${panic.id}`,
      headers: { authorization: `Bearer ${token}` },
    })
    const body = res.json<{ claimedByPartner: unknown }>()
    expect(body.claimedByPartner).toBeNull()
  })

  it('claimedByPartner is populated when panic has been claimed', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const responder = await prisma.partner.findFirstOrThrow({ where: { type: 'RESPONDER_SYSTEM' } })
    const panic = await prisma.panicEvent.create({
      data: {
        externalUserId: 'u1',
        latitude: 0,
        longitude: 0,
        idempotencyKey: 'idem-claimed-1',
        partnerId: source.id,
        status: 'ACKNOWLEDGED',
        claimedByPartnerId: responder.id,
      },
    })
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/panics/${panic.id}`,
      headers: { authorization: `Bearer ${token}` },
    })
    const body = res.json<{ claimedByPartner: { id: string } | null }>()
    expect(body.claimedByPartner).not.toBeNull()
    expect(body.claimedByPartner?.id).toBe(responder.id)
  })
})

describe('GET /api/v1/panics/:id/logs', () => {
  afterEach(async () => {
    await prisma.panicEventLog.deleteMany()
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
    const res = await app.inject({ method: 'GET', url: '/api/v1/panics/some-id/logs' })
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when parent panic does not exist', async () => {
    const app = await createApp()
    const token = await getToken()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/panics/00000000-0000-0000-0000-000000000000/logs',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(404)
  })

  it('returns logs in ascending createdAt order', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const operator = await prisma.operator.findFirstOrThrow()
    const panic = await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'idem-logs-order-1', partnerId: source.id, status: 'DISPATCHED' },
    })
    await prisma.panicEventLog.create({ data: { panicId: panic.id, triggeredBy: 'OPERATOR', operatorId: operator.id, fromStatus: 'PENDING', toStatus: 'ACKNOWLEDGED' } })
    await prisma.panicEventLog.create({ data: { panicId: panic.id, triggeredBy: 'OPERATOR', operatorId: operator.id, fromStatus: 'ACKNOWLEDGED', toStatus: 'DISPATCHED' } })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/panics/${panic.id}/logs`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { fromStatus: string; toStatus: string }[] }>()
    expect(body.data).toHaveLength(2)
    expect(body.data[0].fromStatus).toBe('PENDING')
    expect(body.data[1].fromStatus).toBe('ACKNOWLEDGED')
  })

  it('each log entry includes operator inline when triggeredBy is OPERATOR', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const operator = await prisma.operator.findFirstOrThrow()
    const panic = await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'idem-logs-op-inline-1', partnerId: source.id },
    })
    await prisma.panicEventLog.create({ data: { panicId: panic.id, triggeredBy: 'OPERATOR', operatorId: operator.id, fromStatus: 'PENDING', toStatus: 'ACKNOWLEDGED' } })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/panics/${panic.id}/logs`,
      headers: { authorization: `Bearer ${token}` },
    })
    const body = res.json<{ data: { operator: { id: string; name: string } | null }[] }>()
    expect(body.data[0].operator).not.toBeNull()
    expect(body.data[0].operator?.id).toBe(operator.id)
    expect(body.data[0].operator?.name).toBe(operator.name)
  })

  it('each log entry includes partner inline when triggeredBy is PARTNER_CLAIM', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const responder = await prisma.partner.findFirstOrThrow({ where: { type: 'RESPONDER_SYSTEM' } })
    const panic = await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'idem-logs-partner-inline-1', partnerId: source.id },
    })
    await prisma.panicEventLog.create({ data: { panicId: panic.id, triggeredBy: 'PARTNER_CLAIM', partnerId: responder.id, fromStatus: 'PENDING', toStatus: 'ACKNOWLEDGED' } })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/panics/${panic.id}/logs`,
      headers: { authorization: `Bearer ${token}` },
    })
    const body = res.json<{ data: { partner: { id: string } | null }[] }>()
    expect(body.data[0].partner).not.toBeNull()
    expect(body.data[0].partner?.id).toBe(responder.id)
  })

  it('operator is null when triggeredBy is PARTNER_CLAIM', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const responder = await prisma.partner.findFirstOrThrow({ where: { type: 'RESPONDER_SYSTEM' } })
    const panic = await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'idem-logs-op-null-1', partnerId: source.id },
    })
    await prisma.panicEventLog.create({ data: { panicId: panic.id, triggeredBy: 'PARTNER_CLAIM', partnerId: responder.id, fromStatus: 'PENDING', toStatus: 'ACKNOWLEDGED' } })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/panics/${panic.id}/logs`,
      headers: { authorization: `Bearer ${token}` },
    })
    const body = res.json<{ data: { operator: unknown }[] }>()
    expect(body.data[0].operator).toBeNull()
  })

  it('partner is null when triggeredBy is OPERATOR', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const operator = await prisma.operator.findFirstOrThrow()
    const panic = await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'idem-logs-partner-null-1', partnerId: source.id },
    })
    await prisma.panicEventLog.create({ data: { panicId: panic.id, triggeredBy: 'OPERATOR', operatorId: operator.id, fromStatus: 'PENDING', toStatus: 'ACKNOWLEDGED' } })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/panics/${panic.id}/logs`,
      headers: { authorization: `Bearer ${token}` },
    })
    const body = res.json<{ data: { partner: unknown }[] }>()
    expect(body.data[0].partner).toBeNull()
  })

  it('returns paginated results with correct pagination metadata', async () => {
    const app = await createApp()
    const token = await getToken()
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const operator = await prisma.operator.findFirstOrThrow()
    const panic = await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'idem-logs-pagination-1', partnerId: source.id, status: 'DISPATCHED' },
    })
    await prisma.panicEventLog.create({ data: { panicId: panic.id, triggeredBy: 'OPERATOR', operatorId: operator.id, fromStatus: 'PENDING', toStatus: 'ACKNOWLEDGED' } })
    await prisma.panicEventLog.create({ data: { panicId: panic.id, triggeredBy: 'OPERATOR', operatorId: operator.id, fromStatus: 'ACKNOWLEDGED', toStatus: 'DISPATCHED' } })

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/panics/${panic.id}/logs?page=1&limit=1`,
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>()
    expect(body.data).toHaveLength(1)
    expect(body.pagination.page).toBe(1)
    expect(body.pagination.limit).toBe(1)
    expect(body.pagination.total).toBe(2)
    expect(body.pagination.totalPages).toBe(2)
  })
})
