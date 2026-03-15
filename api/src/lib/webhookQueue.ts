export type WebhookPayload =
  | { event: 'panic.created'; panic: unknown }
  | { event: 'panic.status_updated'; panic: unknown }

export interface WebhookJob {
  url: string
  payload: WebhookPayload
}

type QueueState = {
  jobs: WebhookJob[]
  running: boolean
}

const state: QueueState = { jobs: [], running: false }

async function processNext(): Promise<void> {
  const job = state.jobs.shift()
  if (!job) {
    state.running = false
    return
  }

  if (!job.url) {
    console.warn('[webhookQueue] skipping job with no webhookUrl')
    void processNext()
    return
  }

  try {
    const res = await fetch(job.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(job.payload),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      console.error(`[webhookQueue] delivery failed: ${job.url} → ${res.status}`)
    }
  } catch (err) {
    console.error(`[webhookQueue] delivery error: ${job.url}`, err)
  }

  void processNext()
}

export const webhookQueue = {
  enqueue(job: WebhookJob): void {
    state.jobs.push(job)
    if (!state.running) {
      state.running = true
      setImmediate(() => void processNext())
    }
  },
}
