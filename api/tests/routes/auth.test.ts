import { createApp } from '../../src/app.js'
import prisma from '../../src/lib/prisma.js'

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /api/auth/login', () => {
  it('returns 401 when email does not exist', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: 'irrelevant' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 401 when password is incorrect', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@oderply.com', password: 'wrong-password' },
    })
    expect(res.statusCode).toBe(401)
  })

  it('returns 200 with a signed JWT and operator object on valid credentials', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@oderply.com', password: 'Admin1234!' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json<{ token: string; operator: { id: string; name: string; email: string } }>()
    expect(typeof body.token).toBe('string')
    expect(body.token.length).toBeGreaterThan(0)
    expect(body.operator.email).toBe('admin@oderply.com')
    expect(body.operator.name).toBe('Admin')
    expect(typeof body.operator.id).toBe('string')
  })

  it('does not return passwordHash in the response', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@oderply.com', password: 'Admin1234!' },
    })
    const body = res.json<Record<string, unknown>>()
    expect(JSON.stringify(body)).not.toMatch(/passwordHash/)
  })

  it('returned JWT payload contains operatorId, email, and name', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@oderply.com', password: 'Admin1234!' },
    })
    const { token } = res.json<{ token: string }>()
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as {
      operatorId: string
      email: string
      name: string
    }
    expect(typeof payload.operatorId).toBe('string')
    expect(payload.email).toBe('admin@oderply.com')
    expect(payload.name).toBe('Admin')
  })

  it('returns 400 when email field is not a valid email format', async () => {
    const app = await createApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'not-an-email', password: 'Admin1234!' },
    })
    expect(res.statusCode).toBe(400)
  })
})
