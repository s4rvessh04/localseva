import { sdk } from "../otel-setup.js";

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { etag } from 'hono/etag'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { contextStorage } from 'hono/context-storage'
import { requestId } from 'hono/request-id'
import { prometheus } from '@hono/prometheus'
import { httpInstrumentationMiddleware } from "@hono/otel";

import { config } from "../config/config.js";
import { pg, destroyDB } from "./db/knex.js";
import { successHandler, errorHandler } from "./modules/middlewares/responseHandlers.js";

const app = new Hono()

app.use('*', requestId())

app.use(async (c, next) => {
  const reqId = c.get('requestId');
  console.log(`[Request ID: ${reqId}]: Start`);
  await next();
  console.log(`[Request ID: ${reqId}] End`);
});

app.use(
  etag(),
  logger(),
  contextStorage(),
  cors({
    "allowMethods": config.cors_config.allowed_methods,
    "credentials": config.cors_config.credentials,
    "maxAge": config.cors_config.max_age,
    "origin": config.cors_config.allowed_origins
  })
)

const instrumentationConfig = {
  serviceName: 'localseva',
  serviceVersion: '0.1.0',
  captureRequestHeaders: ['user-agent', 'service-name'],
}
app.use(httpInstrumentationMiddleware(instrumentationConfig))

const { printMetrics, registerMetrics } = prometheus()

// Check if the service is alive
app.get('/health', (c) => c.text(`Alive n' Kickin`));

app.use('*', registerMetrics)
app.get('/metrics', printMetrics)

// Binding the successHandler to all the router request
app.use('*', successHandler);

async function mountRoutes() {
  const mod = await import('./routers/index.js')
  const api_router = mod.default ?? mod;

  app.route(`/${config.app_config.api_prefix}`, api_router)
}

// Error handler on service level
app.onError(errorHandler)

// Route not found handler
app.notFound((c) => {
  return c.json({
    success: false,
    message: 'Not Found: ' + c.req.url,
    request_id: c.get('requestId') ?? undefined
  }, 404)
})

async function start() {
  // Start OpenTelemetry SDK
  // sdk.start();

  // Mount application router
  await mountRoutes()

  const handle = serve({
    fetch: app.fetch,
    port: config.app_config.port,
  }, (info) => {
    console.log(`Server is running on port: ${info.port}`)
  })

  let shutting_down = false

  // Graceful exit handler to handle the database connections
  const graceful = async (sig?: string) => {
    if (shutting_down) return;
    shutting_down = true;
    console.log(`Received ${sig ?? 'signal'} - shutting down...`);

    try {
      if (handle) {
        handle.close()
        console.log('Server closed')
      } else {
        console.log('No HTTP server handle to close (skipping)')
      }

      const db_close = destroyDB(pg)
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('DB close timed out')), 5000))
      await Promise.race([db_close, timeout])
      console.log('DB pool destoryed, exiting...')
      console.log('Shutting down Telemetry service... ')
      sdk.shutdown();
      process.exit(0)
    } catch (error) {
      console.error('Error during graceful shutdown', error)
      process.exit(1)

    }
  }

  process.on('SIGINT', () => graceful('SIGINT'))
  process.on('SIGTERM', () => graceful('SIGTERM'))
  process.on('unhandledRejection', (reason) => {
    console.error('unhandledRejection', reason)
    graceful('unhandledRejection').catch(() => { })
  })
  process.on('uncaughtException', (err) => {
    console.error('uncaughtException', err)
    graceful('uncaughtException').catch(() => process.exit(1))
  })
}

start().catch((e) => {
  console.error('Failed to start server', e)
  process.exit(1)
})
