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
