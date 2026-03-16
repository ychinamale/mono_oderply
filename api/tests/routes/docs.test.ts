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

  it('openapi.json spec has POST /api/auth/login annotated with tag "Auth", 200 and 401 responses', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/docs/openapi.json' })
    const spec = JSON.parse(res.body)
    const login = spec.paths?.['/api/auth/login']?.post
    expect(login).toBeDefined()
    expect(login.tags).toContain('Auth')
    expect(login.responses?.['200']).toBeDefined()
    expect(login.responses?.['401']).toBeDefined()
  })

  it('openapi.json spec has operator panic routes annotated with tag "Panics — Operator" and BearerAuth', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/docs/openapi.json' })
    const spec = JSON.parse(res.body)
    const paths = spec.paths
    const listPanics = paths?.['/api/v1/panics']?.get
    expect(listPanics).toBeDefined()
    expect(listPanics.tags).toContain('Panics — Operator')
    expect(listPanics.security).toEqual(expect.arrayContaining([{ BearerAuth: [] }]))
    expect(listPanics.responses?.['200']).toBeDefined()
    const getPanic = paths?.['/api/v1/panics/{id}']?.get
    expect(getPanic).toBeDefined()
    expect(getPanic.tags).toContain('Panics — Operator')
    expect(getPanic.responses?.['404']).toBeDefined()
    for (const action of ['acknowledge', 'dispatch', 'resolve']) {
      const route = paths?.[`/api/v1/panics/{id}/${action}`]?.post
      expect(route).toBeDefined()
      expect(route.tags).toContain('Panics — Operator')
      expect(route.security).toEqual(expect.arrayContaining([{ BearerAuth: [] }]))
      expect(route.responses?.['200']).toBeDefined()
      expect(route.responses?.['400']).toBeDefined()
    }
  })

  it('openapi.json spec has POST /api/v1/panics annotated with tag "Panics — Partner" and ApiKeyAuth security', async () => {
    const app = await createApp()
    const res = await app.inject({ method: 'GET', url: '/docs/openapi.json' })
    const spec = JSON.parse(res.body)
    const create = spec.paths?.['/api/v1/panics']?.post
    expect(create).toBeDefined()
    expect(create.tags).toContain('Panics — Partner')
    expect(create.security).toEqual(expect.arrayContaining([{ ApiKeyAuth: [] }]))
    expect(create.responses?.['201']).toBeDefined()
    expect(create.responses?.['409']).toBeDefined()
    const claim = spec.paths?.['/api/v1/panics/{id}/claim']?.post
    expect(claim).toBeDefined()
    expect(claim.tags).toContain('Panics — Partner')
    expect(claim.security).toEqual(expect.arrayContaining([{ ApiKeyAuth: [] }]))
    expect(claim.responses?.['200']).toBeDefined()
    expect(claim.responses?.['409']).toBeDefined()
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
