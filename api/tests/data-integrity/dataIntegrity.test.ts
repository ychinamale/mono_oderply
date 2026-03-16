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
})
