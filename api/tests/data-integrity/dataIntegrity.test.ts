import * as Prisma from '../../src/generated/prisma/internal/prismaNamespace.js'
import { createApp } from '../../src/app.js'
import prisma from '../../src/lib/prisma.js'

afterAll(async () => {
  await prisma.$disconnect()
})

afterEach(async () => {
  await prisma.panicEventLog.deleteMany()
  await prisma.panicEvent.deleteMany()
})

describe('Data Integrity', () => {
  it('idempotencyKey UNIQUE constraint prevents duplicate PanicEvent rows at the DB level', async () => {
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const data = { externalUserId: 'u1', latitude: 0, longitude: 0, partnerId: source.id, idempotencyKey: 'idem-unique-test' }
    await prisma.panicEvent.create({ data })
    const err = await prisma.panicEvent.create({ data }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(Prisma.PrismaClientKnownRequestError)
    expect((err as Prisma.PrismaClientKnownRequestError).code).toBe('P2002')
  })

  it('PanicEvent and PanicEventLog are always written together — never one without the other', async () => {
    const app = await createApp()
    // Sign a JWT with a non-existent operatorId so the FK constraint on PanicEventLog fails
    const token = app.jwt.sign({ operatorId: 'nonexistent-operator-id', email: 'x@x.com', name: 'X' })
    const source = await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    const panic = await prisma.panicEvent.create({
      data: { externalUserId: 'u1', latitude: 0, longitude: 0, partnerId: source.id, idempotencyKey: 'atomic-test-idem' },
    })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panic.id}/acknowledge`,
      headers: { authorization: `Bearer ${token}` },
    })

    // Route should fail (transaction rolled back due to FK violation)
    expect(res.statusCode).not.toBe(200)
    // PanicEvent status must still be PENDING — no partial write
    const unchanged = await prisma.panicEvent.findUniqueOrThrow({ where: { id: panic.id } })
    expect(unchanged.status).toBe('PENDING')
    // No log row should have been created
    const logCount = await prisma.panicEventLog.count()
    expect(logCount).toBe(0)
  })

  it('every PanicEventLog has exactly one of operatorId or partnerId set — never both, never neither', async () => {
    const app = await createApp()
    await prisma.partner.findFirstOrThrow({ where: { type: 'PANIC_SOURCE' } })
    await prisma.partner.findFirstOrThrow({ where: { type: 'RESPONDER_SYSTEM' } })

    // Create a panic via PANIC_SOURCE (creates no log)
    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: { 'x-api-key': 'ps-test-api-key-001' },
      payload: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'invariant-test-idem-1' },
    })
    const panicId = submitRes.json<{ id: string }>().id

    // Claim via RESPONDER_SYSTEM — creates a PARTNER_CLAIM log
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panicId}/claim`,
      headers: { 'x-api-key': 'rs-test-api-key-001' },
    })

    // Create a second panic and acknowledge it via operator — creates an OPERATOR log
    const submitRes2 = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: { 'x-api-key': 'ps-test-api-key-001' },
      payload: { externalUserId: 'u2', latitude: 0, longitude: 0, idempotencyKey: 'invariant-test-idem-2' },
    })
    const panicId2 = submitRes2.json<{ id: string }>().id
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@oderply.com', password: 'Admin1234!' },
    })
    const token = loginRes.json<{ token: string }>().token
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panicId2}/acknowledge`,
      headers: { authorization: `Bearer ${token}` },
    })

    const logs = await prisma.panicEventLog.findMany()
    expect(logs.length).toBeGreaterThan(0)
    for (const log of logs) {
      const hasOperator = log.operatorId !== null
      const hasPartner = log.partnerId !== null
      // Exactly one must be set
      expect(hasOperator !== hasPartner).toBe(true)
    }
  })

  it('claimedByPartnerId always references a RESPONDER_SYSTEM partner — never a PANIC_SOURCE', async () => {
    const app = await createApp()
    const submitRes = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: { 'x-api-key': 'ps-test-api-key-001' },
      payload: { externalUserId: 'u1', latitude: 0, longitude: 0, idempotencyKey: 'claim-type-test-idem' },
    })
    const panicId = submitRes.json<{ id: string }>().id
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panicId}/claim`,
      headers: { 'x-api-key': 'rs-test-api-key-001' },
    })

    const claimed = await prisma.panicEvent.findMany({
      where: { claimedByPartnerId: { not: null } },
      include: { claimedByPartner: true },
    })
    expect(claimed.length).toBeGreaterThan(0)
    for (const event of claimed) {
      expect(event.claimedByPartner?.type).toBe('RESPONDER_SYSTEM')
    }
  })
})
