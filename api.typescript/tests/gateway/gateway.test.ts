import { jest } from '@jest/globals'
import { io as ioc, type Socket } from 'socket.io-client'

import { createApp } from '../../src/app.js'
import prisma from '../../src/lib/prisma.js'
import { webhookQueue } from '../../src/lib/webhookQueue.js'

// Returns a JWT with a real operatorId from the seeded Operator table (needed
// for routes that write PanicEventLog, which has an FK on operatorId).
async function getRealOperatorToken(app: Awaited<ReturnType<typeof createApp>>): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email: 'admin@oderply.com', password: 'Admin1234!' },
  })
  return res.json<{ token: string }>().token
}

afterAll(async () => {
  await prisma.$disconnect()
})

describe('WebSocket Gateway', () => {
  beforeEach(() => {
    jest.spyOn(webhookQueue, 'enqueue').mockImplementation(() => {})
  })

  afterEach(async () => {
    jest.restoreAllMocks()
    await prisma.panicEventLog.deleteMany()
    await prisma.panicEvent.deleteMany()
  })

  it('rejects connection when no auth token is provided', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    const error = await new Promise<Error>((resolve, reject) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: {} })

      const timeout = setTimeout(() => {
        client.disconnect()
        reject(new Error('Expected connect_error but did not receive one'))
      }, 3000)

      client.on('connect_error', (err: Error) => {
        clearTimeout(timeout)
        client.disconnect()
        resolve(err)
      })

      client.on('connect', () => {
        clearTimeout(timeout)
        client.disconnect()
        reject(new Error('Expected connection to be rejected but it connected'))
      })
    })

    await app.close()
    expect(error.message).toMatch(/unauthorised/i)
  })

  it('rejects connection when auth token is invalid', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    const error = await new Promise<Error>((resolve, reject) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: { token: 'not-a-valid-jwt' } })

      const timeout = setTimeout(() => {
        client.disconnect()
        reject(new Error('Expected connect_error but did not receive one'))
      }, 3000)

      client.on('connect_error', (err: Error) => {
        clearTimeout(timeout)
        client.disconnect()
        resolve(err)
      })

      client.on('connect', () => {
        clearTimeout(timeout)
        client.disconnect()
        reject(new Error('Expected connection to be rejected but it connected'))
      })
    })

    await app.close()
    expect(error.message).toMatch(/unauthorised/i)
  })

  it('accepts connection when auth token is a valid operator JWT', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    const token = app.jwt.sign({ operatorId: 'test-op', email: 'op@test.com', name: 'Test Op' })

    await new Promise<void>((resolve, reject) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: { token } })

      const timeout = setTimeout(() => {
        client.disconnect()
        reject(new Error('Expected connection to succeed but it timed out'))
      }, 3000)

      client.on('connect', () => {
        clearTimeout(timeout)
        client.disconnect()
        resolve()
      })

      client.on('connect_error', (err: Error) => {
        clearTimeout(timeout)
        client.disconnect()
        reject(err)
      })
    })

    await app.close()
  })

  it('panic:new payload matches the shape of GET /api/v1/panics/:id response', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    const token = app.jwt.sign({ operatorId: 'test-op', email: 'op@test.com', name: 'Test Op' })

    let panicId: string | null = null
    const emitted = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: { token } })

      const timeout = setTimeout(() => {
        client.disconnect()
        reject(new Error('panic:new not received within timeout'))
      }, 3000)

      client.on('panic:new', (data: Record<string, unknown>) => {
        clearTimeout(timeout)
        client.disconnect()
        panicId = data.id as string
        resolve(data)
      })

      client.on('connect', () => {
        void app.inject({
          method: 'POST',
          url: '/api/v1/panics',
          headers: { 'x-api-key': 'ps-test-api-key-001' },
          payload: {
            externalUserId: 'user-ws-get-shape',
            latitude: -26.1052,
            longitude: 28.056,
            idempotencyKey: `ws-get-shape-${Date.now()}`,
          },
        })
      })
    })

    const getRes = await app.inject({
      method: 'GET',
      url: `/api/v1/panics/${panicId}`,
      headers: { authorization: `Bearer ${token}` },
    })

    await app.close()
    expect(emitted).toEqual(getRes.json())
  })

  it('panic:new payload matches the shape of POST /api/v1/panics 201 response', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    const token = app.jwt.sign({ operatorId: 'test-op', email: 'op@test.com', name: 'Test Op' })

    let postBody: Record<string, unknown> | null = null
    const emitted = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: { token } })

      const timeout = setTimeout(() => {
        client.disconnect()
        reject(new Error('panic:new not received within timeout'))
      }, 3000)

      client.on('panic:new', (data: Record<string, unknown>) => {
        clearTimeout(timeout)
        client.disconnect()
        resolve(data)
      })

      client.on('connect', () => {
        void app
          .inject({
            method: 'POST',
            url: '/api/v1/panics',
            headers: { 'x-api-key': 'ps-test-api-key-001' },
            payload: {
              externalUserId: 'user-ws-shape',
              latitude: -26.1052,
              longitude: 28.056,
              idempotencyKey: 'ws-shape-key-00000001',
            },
          })
          .then((res) => {
            postBody = res.json<Record<string, unknown>>()
          })
      })
    })

    await app.close()
    expect(emitted).toEqual(postBody)
  })

  it('emits panic:new to connected operator clients when a panic is submitted', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    const token = app.jwt.sign({ operatorId: 'test-op', email: 'op@test.com', name: 'Test Op' })

    const received = await new Promise<unknown>((resolve, reject) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: { token } })

      const timeout = setTimeout(() => {
        client.disconnect()
        reject(new Error('panic:new not received within timeout'))
      }, 3000)

      client.on('panic:new', (data: unknown) => {
        clearTimeout(timeout)
        client.disconnect()
        resolve(data)
      })

      client.on('connect', () => {
        void app.inject({
          method: 'POST',
          url: '/api/v1/panics',
          headers: { 'x-api-key': 'ps-test-api-key-001' },
          payload: {
            externalUserId: 'user-ws-1',
            latitude: -26.1052,
            longitude: 28.056,
            idempotencyKey: 'ws-test-key-00000001',
          },
        })
      })
    })

    await app.close()
    expect(received).toBeDefined()
  })

  it('emits panic:updated to connected operator clients when a panic is acknowledged', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    const token = await getRealOperatorToken(app)

    const received = await new Promise<unknown>((resolve, reject) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: { token } })

      const timeout = setTimeout(() => {
        client.disconnect()
        reject(new Error('panic:updated not received within timeout'))
      }, 3000)

      client.on('panic:updated', (data: unknown) => {
        clearTimeout(timeout)
        client.disconnect()
        resolve(data)
      })

      client.on('connect', () => {
        app.inject({
          method: 'POST',
          url: '/api/v1/panics',
          headers: { 'x-api-key': 'ps-test-api-key-001' },
          payload: {
            externalUserId: 'user-ws-ack',
            latitude: -26.1,
            longitude: 28.0,
            idempotencyKey: `ws-ack-key-${Date.now()}`,
          },
        }).then((createRes) => {
          if (createRes.statusCode !== 201) {
            clearTimeout(timeout)
            client.disconnect()
            reject(new Error(`Panic creation failed: ${createRes.statusCode} ${createRes.body}`))
            return
          }
          const panicId = createRes.json<{ id: string }>().id
          return app.inject({
            method: 'POST',
            url: `/api/v1/panics/${panicId}/acknowledge`,
            headers: { authorization: `Bearer ${token}` },
          })
        }).then((ackRes) => {
          if (ackRes && ackRes.statusCode !== 200) {
            clearTimeout(timeout)
            client.disconnect()
            reject(new Error(`Acknowledge failed: ${ackRes.statusCode} ${ackRes.body}`))
          }
        }).catch((err: unknown) => {
          clearTimeout(timeout)
          client.disconnect()
          reject(err)
        })
      })
    })

    await app.close()
    expect(received).toBeDefined()
  })

  it('emits panic:updated to connected operator clients when a panic is claimed', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    const token = app.jwt.sign({ operatorId: 'test-op', email: 'op@test.com', name: 'Test Op' })

    const received = await new Promise<unknown>((resolve, reject) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: { token } })

      const timeout = setTimeout(() => {
        client.disconnect()
        reject(new Error('panic:updated not received within timeout'))
      }, 3000)

      client.on('panic:updated', (data: unknown) => {
        clearTimeout(timeout)
        client.disconnect()
        resolve(data)
      })

      client.on('connect', () => {
        // Create then claim in sequence inside the connect handler to avoid
        // any window where the panic could be deleted by another test's afterEach
        app.inject({
          method: 'POST',
          url: '/api/v1/panics',
          headers: { 'x-api-key': 'ps-test-api-key-001' },
          payload: {
            externalUserId: 'user-ws-claim',
            latitude: -26.1,
            longitude: 28.0,
            idempotencyKey: `ws-claim-key-${Date.now()}`,
          },
        }).then((createRes) => {
          if (createRes.statusCode !== 201) {
            clearTimeout(timeout)
            client.disconnect()
            reject(new Error(`Panic creation failed: ${createRes.statusCode}`))
            return
          }
          const panicId = createRes.json<{ id: string }>().id
          return app.inject({
            method: 'POST',
            url: `/api/v1/panics/${panicId}/claim`,
            headers: { 'x-api-key': 'rs-test-api-key-001' },
          })
        }).then((claimRes) => {
          if (claimRes && claimRes.statusCode !== 200) {
            clearTimeout(timeout)
            client.disconnect()
            reject(new Error(`Claim failed: ${claimRes.statusCode} ${claimRes.body}`))
          }
        }).catch((err: unknown) => {
          clearTimeout(timeout)
          client.disconnect()
          reject(err)
        })
      })
    })

    await app.close()
    expect(received).toBeDefined()
  })

  it('emits panic:updated to connected operator clients when a panic is dispatched', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    const token = await getRealOperatorToken(app)

    // Pre-stage the panic to ACKNOWLEDGED so dispatch is the only action that triggers panic:updated
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: { 'x-api-key': 'ps-test-api-key-001' },
      payload: {
        externalUserId: 'user-ws-dispatch',
        latitude: -26.1,
        longitude: 28.0,
        idempotencyKey: `ws-dispatch-key-${Date.now()}`,
      },
    })
    const panicId = createRes.json<{ id: string }>().id
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panicId}/acknowledge`,
      headers: { authorization: `Bearer ${token}` },
    })

    const received = await new Promise<unknown>((resolve, reject) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: { token } })

      const timeout = setTimeout(() => {
        client.disconnect()
        reject(new Error('panic:updated not received within timeout'))
      }, 3000)

      client.on('panic:updated', (data: unknown) => {
        clearTimeout(timeout)
        client.disconnect()
        resolve(data)
      })

      client.on('connect', () => {
        void app.inject({
          method: 'POST',
          url: `/api/v1/panics/${panicId}/dispatch`,
          headers: { authorization: `Bearer ${token}` },
        }).then((dispatchRes) => {
          if (dispatchRes.statusCode !== 200) {
            clearTimeout(timeout)
            client.disconnect()
            reject(new Error(`Dispatch failed: ${dispatchRes.statusCode} ${dispatchRes.body}`))
          }
        })
      })
    })

    await app.close()
    expect(received).toBeDefined()
  })

  it('emits panic:updated to connected operator clients when a panic is resolved', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    const token = await getRealOperatorToken(app)

    // Pre-stage the panic to DISPATCHED so resolve is the only action that triggers panic:updated
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: { 'x-api-key': 'ps-test-api-key-001' },
      payload: {
        externalUserId: 'user-ws-resolve',
        latitude: -26.1,
        longitude: 28.0,
        idempotencyKey: `ws-resolve-key-${Date.now()}`,
      },
    })
    const panicId = createRes.json<{ id: string }>().id
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panicId}/acknowledge`,
      headers: { authorization: `Bearer ${token}` },
    })
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panicId}/dispatch`,
      headers: { authorization: `Bearer ${token}` },
    })

    const received = await new Promise<unknown>((resolve, reject) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: { token } })

      const timeout = setTimeout(() => {
        client.disconnect()
        reject(new Error('panic:updated not received within timeout'))
      }, 3000)

      client.on('panic:updated', (data: unknown) => {
        clearTimeout(timeout)
        client.disconnect()
        resolve(data)
      })

      client.on('connect', () => {
        void app.inject({
          method: 'POST',
          url: `/api/v1/panics/${panicId}/resolve`,
          headers: { authorization: `Bearer ${token}` },
        }).then((resolveRes) => {
          if (resolveRes.statusCode !== 200) {
            clearTimeout(timeout)
            client.disconnect()
            reject(new Error(`Resolve failed: ${resolveRes.statusCode} ${resolveRes.body}`))
          }
        })
      })
    })

    await app.close()
    expect(received).toBeDefined()
  })

  it('does not emit panic:updated to clients that connected with an invalid token', async () => {
    const app = await createApp()
    await app.listen({ port: 0 })
    const { port } = app.server.address() as { port: number }

    // A valid token to drive the acknowledge action
    const validToken = await getRealOperatorToken(app)

    // Create a panic to acknowledge
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/v1/panics',
      headers: { 'x-api-key': 'ps-test-api-key-001' },
      payload: {
        externalUserId: 'user-ws-invalid-token',
        latitude: -26.1,
        longitude: 28.0,
        idempotencyKey: `ws-invalid-token-key-${Date.now()}`,
      },
    })
    const panicId = createRes.json<{ id: string }>().id

    // A client with an invalid token that should be rejected before receiving any events
    const connectionRejected = await new Promise<boolean>((resolve) => {
      const client: Socket = ioc(`http://localhost:${port}`, { auth: { token: 'invalid-token' } })

      const timeout = setTimeout(() => {
        client.disconnect()
        // Connection was not rejected within timeout — treat as failure to reject
        resolve(false)
      }, 1000)

      client.on('connect_error', () => {
        clearTimeout(timeout)
        client.disconnect()
        resolve(true)
      })

      client.on('panic:updated', () => {
        clearTimeout(timeout)
        client.disconnect()
        resolve(false)
      })
    })

    // Trigger panic:updated to verify the invalid client isn't receiving it
    await app.inject({
      method: 'POST',
      url: `/api/v1/panics/${panicId}/acknowledge`,
      headers: { authorization: `Bearer ${validToken}` },
    })

    await app.close()
    expect(connectionRejected).toBe(true)
  })
})
