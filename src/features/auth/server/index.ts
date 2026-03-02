import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from './auth'

export const getSession = createServerFn({ method: 'GET' }).handler(async () => {
  const request = getRequest()
  return auth.api.getSession({ headers: request.headers })
})

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getRequest()
  await auth.api.signOut({ headers: request.headers })
})
