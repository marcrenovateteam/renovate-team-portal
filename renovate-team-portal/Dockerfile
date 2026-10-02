FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 PORTAL_DATA_DIR=/data NEXT_TELEMETRY_DISABLED=1
RUN groupadd --gid 1001 portal && useradd --uid 1001 --gid portal portal && mkdir /data && chown portal:portal /data
COPY --from=build --chown=portal:portal /app/.next/standalone ./
COPY --from=build --chown=portal:portal /app/.next/static ./.next/static
COPY --from=build --chown=portal:portal /app/public ./public
COPY --from=build --chown=portal:portal /app/drizzle ./drizzle
COPY --from=build --chown=portal:portal /app/migration ./migration
COPY --from=build --chown=portal:portal /app/lib/database.mjs /app/lib/auth-core.mjs ./lib/
COPY --from=build --chown=portal:portal /app/scripts/init.mjs ./scripts/init.mjs
USER portal
EXPOSE 3000
CMD ["node","server.js"]
