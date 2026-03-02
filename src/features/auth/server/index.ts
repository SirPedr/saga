import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { auth } from './auth'

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const request = getRequest()
  await auth.api.signOut({ headers: request.headers })
})
