# ---------- builder stage ----------
FROM node:20-slim AS builder

WORKDIR /app

# install pnpm
COPY package.json pnpm-lock.yaml* ./
RUN npm i -g pnpm
RUN pnpm install

# copy all sources
COPY . .

# build (tsc)
RUN pnpm run build || echo "no build script"

# ---------- runtime stage ----------
FROM node:20-slim AS runner

WORKDIR /app

# create non-root user
RUN addgroup --system app && adduser --system --ingroup app app

# copy node_modules
COPY --from=builder /app/node_modules ./node_modules

# copy compiled output
COPY --from=builder /app/dist ./dist

# copy package.json
COPY --from=builder /app/package.json ./package.json

# 🔥 IMPORTANT: otel-setup.js is already inside /app/dist/
# so no special COPY needed — it's already included above.

# runtime env
ENV NODE_ENV=production
ENV PORT=8000

# service name + collector endpoints
ENV OTEL_SERVICE_NAME=localseva
ENV OTEL_OTLP_ENDPOINT_TRACE=http://otel-collector:4318/v1/traces
ENV OTEL_OTLP_ENDPOINT_METRICS=http://otel-collector:4318/v1/metrics

# 🔥 OTEL MUST LOAD BEFORE ANY OTHER CODE
ENV NODE_OPTIONS="--require /app/dist/otel-setup.js"

EXPOSE 8000

# switch user
USER app

# startup file (correct path)
ENTRYPOINT ["sh", "-lc", "node /app/dist/src/index.js"]
CMD []
