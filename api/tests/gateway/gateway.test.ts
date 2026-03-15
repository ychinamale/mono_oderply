import { jest } from '@jest/globals'
import { io as ioc, type Socket } from 'socket.io-client'

import { createApp } from '../../src/app.js'
import prisma from '../../src/lib/prisma.js'
import { webhookQueue } from '../../src/lib/webhookQueue.js'

const OPERATOR_JWT_SECRET = 'test-secret'

// Minimal JWT for test — signed with the same secret used by createApp
async function makeOperatorToken(): Promise<string> {
  // Use the app's jwt.sign so we don't need an external JWT lib
  const app = await createApp()
  await app.ready()
  const token = app.jwt.sign({ operatorId: 'test-op', email: 'op@test.com', name: 'Test Op' })
  await app.close()
  return token
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
    await prisma.panicEvent.deleteMany()
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
})
