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

  it('a failed webhook delivery does not throw or crash the queue', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    // should not throw
    await expect(
      new Promise<void>((resolve) => {
        webhookQueue.enqueue({ url: 'http://example.com/fail', payload: { event: 'panic.created', panic: {} as never } })
        setImmediate(resolve)
      })
    ).resolves.toBeUndefined()
  })

  it('queue continues processing subsequent jobs after a delivery failure', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    const delivered: string[] = []
    jest.spyOn(global, 'fetch').mockImplementation((url) => {
      if (url === 'http://example.com/fail') return Promise.reject(new Error('network error'))
      delivered.push(url as string)
      return Promise.resolve(new Response(null, { status: 200 }))
    })
    webhookQueue.enqueue({ url: 'http://example.com/fail', payload: { event: 'panic.created', panic: {} as never } })
    webhookQueue.enqueue({ url: 'http://example.com/after-fail', payload: { event: 'panic.created', panic: {} as never } })
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(delivered).toContain('http://example.com/after-fail')
  })

  it('a job with no webhookUrl is skipped without throwing', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 200 }))
    webhookQueue.enqueue({ url: '', payload: { event: 'panic.created', panic: {} as never } })
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
