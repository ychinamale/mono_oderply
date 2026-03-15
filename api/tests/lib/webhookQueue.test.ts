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

  it('jobs are processed in FIFO order', async () => {
    const order: string[] = []
    jest.spyOn(global, 'fetch').mockImplementation((url) => {
      order.push(url as string)
      return Promise.resolve(new Response(null, { status: 200 }))
    })
    webhookQueue.enqueue({ url: 'http://example.com/first', payload: { event: 'panic.created', panic: {} as never } })
    webhookQueue.enqueue({ url: 'http://example.com/second', payload: { event: 'panic.created', panic: {} as never } })
    webhookQueue.enqueue({ url: 'http://example.com/third', payload: { event: 'panic.created', panic: {} as never } })
    // wait for all three to process
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(order).toEqual(['http://example.com/first', 'http://example.com/second', 'http://example.com/third'])
  })
})
