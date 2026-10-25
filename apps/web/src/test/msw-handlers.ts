import { http, HttpResponse } from 'msw'

const API_BASE_URL = 'http://localhost:3000'

export const handlers = [
  // Auth endpoints
  http.get(`${API_BASE_URL}/api/auth/session`, () => {
    return HttpResponse.json({
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
      session: {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    })
  }),

  http.post(`${API_BASE_URL}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string }

    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
        },
        session: {
          token: 'test-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
      })
    }

    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }),

  http.post(`${API_BASE_URL}/api/auth/logout`, () => {
    return HttpResponse.json({ success: true })
  }),

  // Organizations endpoints
  http.get(`${API_BASE_URL}/api/organizations`, () => {
    return HttpResponse.json([
      {
        id: 'org-1',
        name: 'Test Organization',
        slug: 'test-org',
        role: 'owner',
        createdAt: new Date().toISOString(),
      },
    ])
  }),

  http.get(`${API_BASE_URL}/api/organizations/:id`, ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: 'Test Organization',
      slug: 'test-org',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }),

  http.post(`${API_BASE_URL}/api/organizations`, async ({ request }) => {
    const body = (await request.json()) as { name: string; slug: string }

    return HttpResponse.json({
      id: 'new-org-id',
      name: body.name,
      slug: body.slug,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }),
]
