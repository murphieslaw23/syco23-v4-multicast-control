FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run typecheck && npm test && npm run build

FROM node:22-alpine AS runtime
RUN apk add --no-cache ffmpeg tini
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 SYCO_DB_PATH=/app/data/syco23.sqlite
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/app ./app
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data && chown -R node:node /app
USER node
VOLUME ["/app/data"]
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["./node_modules/.bin/tsx", "app/server/runtime-server.ts"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health/ready || exit 1
