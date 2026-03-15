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
})
