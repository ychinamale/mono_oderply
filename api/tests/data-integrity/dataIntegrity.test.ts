import * as Prisma from '../../src/generated/prisma/internal/prismaNamespace.js'
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
})
