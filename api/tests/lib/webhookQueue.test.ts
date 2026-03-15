import { jest } from '@jest/globals'
import { webhookQueue } from '../../src/lib/webhookQueue.js'

describe('webhookQueue', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('enqueue() adds a job to the queue', async () => {
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
    webhookQueue.enqueue({ url: 'http://example.com/webhook', payload: { event: 'panic.created', panic: {} as never } })
    await new Promise(resolve => setImmediate(resolve))
    expect(mockFetch).toHaveBeenCalledWith('http://example.com/webhook', expect.objectContaining({ method: 'POST' }))
  })
})
