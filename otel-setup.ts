import process from 'process';
import { httpInstrumentationMiddleware } from "@hono/otel";
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions';

console.log("🔥 OTEL SETUP LOADED");

// Enable diagnostic logging to see what's happening
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);

// Basic resource info (service name/version)
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'node-app',
  [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION || '1.0.0',
});

// OTLP exporters pointed at collector
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_OTLP_ENDPOINT_TRACE || 'http://otel-collector:4318/v1/traces',
  headers: {}, // Optional: add any required headers
  timeoutMillis: 10000, // 10 second timeout
});

const metricExporter = new OTLPMetricExporter({
  url: process.env.OTEL_OTLP_ENDPOINT_METRICS || 'http://otel-collector:4318/v1/metrics',
  timeoutMillis: 10000,
});

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 5000,
});

// SDK with multiple exporters for debugging
export const sdk = new NodeSDK({
  resource,
  traceExporter, // Comment this and use consoleExporter to debug locally
  // traceExporter: consoleExporter, // Uncomment to see traces in console
  metricReader: metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Explicitly configure instrumentations
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Disable noisy fs instrumentation
      },
      '@opentelemetry/instrumentation-http': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
      },
    }),
  ],
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down OTLP SDK...');
  sdk
    .shutdown()
    .then(() => console.log('✅ OTLP SDK shut down successfully'))
    .catch((error) => console.error('❌ Error shutting down OTLP SDK', error))
    .finally(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down OTLP SDK...');
  sdk
    .shutdown()
    .then(() => console.log('✅ OTLP SDK shut down successfully'))
    .catch((error) => console.error('❌ Error shutting down OTLP SDK', error))
    .finally(() => process.exit(0));
});

// Start the SDK
sdk.start();
