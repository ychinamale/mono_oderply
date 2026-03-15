export type WebhookPayload =
  | { event: 'panic.created'; panic: unknown }
  | { event: 'panic.status_updated'; panic: unknown }

export interface WebhookJob {
  url: string
  payload: WebhookPayload
}

export const webhookQueue = {
  enqueue(job: WebhookJob): void {
    void job
  },
}
