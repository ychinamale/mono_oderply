import { createApp } from '../../src/app.js'

describe('API Documentation', () => {
  it('GET /docs returns 200 with HTML containing the API title', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/docs/' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toMatch(/text\/html/)
    expect(res.body).toContain('openapi.json')
  })

  it('GET /docs/openapi.json returns 200 with OpenAPI spec containing correct title', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/docs/openapi.json' })
    expect(res.statusCode).toBe(200)
    const spec = JSON.parse(res.body)
    expect(spec.info.title).toBe('ODERP-ly API')
  })

  it('GET /docs/openapi.json spec contains ApiKeyAuth and BearerAuth security schemes', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/docs/openapi.json' })
    const spec = JSON.parse(res.body)
    const schemes = spec.components?.securitySchemes
    expect(schemes?.ApiKeyAuth).toBeDefined()
    expect(schemes?.ApiKeyAuth.type).toBe('apiKey')
    expect(schemes?.ApiKeyAuth.in).toBe('header')
    expect(schemes?.ApiKeyAuth.name).toBe('x-api-key')
    expect(schemes?.BearerAuth).toBeDefined()
    expect(schemes?.BearerAuth.type).toBe('http')
    expect(schemes?.BearerAuth.scheme).toBe('bearer')
    expect(schemes?.BearerAuth.bearerFormat).toBe('JWT')
  })
})
