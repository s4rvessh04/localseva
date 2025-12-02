import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

type ResponsePayload = {
  success: boolean
  message?: string
  data?: any | null
}

// Success middleware: run downstream, then send standardized JSON if handler stored data
export async function successHandler(c: Context, next: Next) {
  await next()

  // If route already set a Response (e.g., c.body/c.json was used) we avoid overriding it.
  // Convention: handlers should call c.set('response', { data, message?, status? })
  const resp = (c.get && c.get('response')) // fallbacks in case API differs
  if (!resp) {
    // nothing to wrap — do nothing (handler already wrote response or it's a 204)
    return
  }

  const status = resp.status ?? 200
  const payload: ResponsePayload = {
    success: status >= 200 && status < 300,
    message: resp.message ?? (status >= 200 && status < 300 ? 'OK' : undefined),
    data: resp.data ?? null
  }

  return c.json(payload, status)
}

// Error handler for app.onError
export function errorHandler(err: unknown, c: Context) {
  const req_id = c.req.header('x-request-id') || 'no-id';

  // map known HTTPException
  if (err instanceof HTTPException) {
    const status = err.status ?? 500
    return c.json({
      success: false,
      message: err.message || 'Error',
      data: null,
      request_id: req_id
    }, status)
  }

  console.error(`[${req_id}] Unhandled error:`, err)
  // hide internals; provide a consistent shape
  return c.json({
    success: false,
    message: 'Internal Server Error',
    data: null
  }, 500)
}
