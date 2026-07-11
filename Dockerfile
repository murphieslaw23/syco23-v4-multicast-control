FROM node:22-bookworm-slim AS build-deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci

FROM build-deps AS build
COPY . .
RUN npm run release:check

FROM node:22-bookworm-slim AS runtime-deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev \
  && npm cache clean --force

FROM node:22-bookworm-slim AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates ffmpeg tini \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --gid 10001 syco23 \
  && useradd --uid 10001 --gid 10001 --create-home --shell /usr/sbin/nologin syco23
WORKDIR /app
ENV NODE_ENV=production \
  HOST=0.0.0.0 \
  PORT=3000 \
  SYCO_DB_DRIVER=native \
  SYCO_DB_PATH=/app/data/syco23.sqlite \
  SYCO_DATA_DIR=/app/data \
  SYCO_ASSET_DIR=/app/data/assets \
  SYCO_PREVIEW_DIR=/app/data/preview \
  SYCO_BACKUP_DIR=/app/data/backups \
  NODE_OPTIONS=--enable-source-maps
COPY --from=runtime-deps --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /app/package.json /app/package-lock.json ./
COPY --from=build --chown=10001:10001 /app/app ./app
COPY --from=build --chown=10001:10001 /app/dist ./dist
RUN mkdir -p /app/data/assets /app/data/preview /app/data/backups \
  && chown -R 10001:10001 /app/data
USER 10001:10001
VOLUME ["/app/data"]
EXPOSE 3000
STOPSIGNAL SIGTERM
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["./node_modules/.bin/tsx", "app/server/runtime-server.ts"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
