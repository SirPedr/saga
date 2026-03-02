import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/auth/get-session', () => {
    return HttpResponse.json(null)
  }),
]
