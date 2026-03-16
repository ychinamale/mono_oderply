import { createApp } from '../../src/app.js'

describe('API Documentation', () => {
  it('GET /docs returns 200 with HTML containing the API title', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/docs' })
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('ODERP-ly API')
  })

  it('GET /docs/openapi.json returns 200 with OpenAPI spec containing correct title', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/docs/openapi.json' })
    expect(res.statusCode).toBe(200)
    const spec = JSON.parse(res.body)
    expect(spec.info.title).toBe('ODERP-ly API')
  })
})
