import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { WebSocketServer } from 'ws'
import { PersistentDatabase } from './persistent-db'
import { RuntimeEventBus } from './runtime/event-bus'
import { ControlService } from './runtime/control-service'
import type { DestinationState, OutputProfile } from '../types'

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '0.0.0.0'
const token = process.env.SYCO_API_TOKEN || ''
const distRoot = resolve(process.cwd(), 'dist')
const persistence = new PersistentDatabase(process.env.SYCO_DB_PATH)
const events = new RuntimeEventBus()
const service = new ControlService(persistence, events)

function json(response: ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  response.end(JSON.stringify(data))
}

async function body(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let length = 0
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk)
    length += bytes.length
    if (length > 1_000_000) throw new Error('Request body exceeds 1 MB')
    chunks.push(bytes)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function authorized(request: IncomingMessage): boolean {
  if (!token) return true
  const header = request.headers.authorization || ''
  const queryToken = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).searchParams.get('token') || ''
  return header === `Bearer ${token}` || queryToken === token
}

function mime(path: string): string {
  return ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' } as Record<string, string>)[extname(path)] || 'application/octet-stream'
}

async function serveStatic(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const raw = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname
  const safe = normalize(raw).replace(/^(\.\.(\/|\\|$))+/, '')
  let path = join(distRoot, safe === '/' ? 'index.html' : safe)
  if (!path.startsWith(distRoot) || !existsSync(path) || (await stat(path)).isDirectory()) path = join(distRoot, 'index.html')
  response.writeHead(200, { 'content-type': mime(path), 'cache-control': path.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable' })
  createReadStream(path).pipe(response)
}

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  if (!url.pathname.startsWith('/api/')) return serveStatic(request, response)
  if (!authorized(request)) return json(response, 401, { ok: false, error: 'Unauthorized' })
  try {
    if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() })
    if (request.method === 'GET' && url.pathname === '/api/status') return json(response, 200, { ok: true, data: service.status() })
    if (request.method === 'GET' && url.pathname === '/api/events') return json(response, 200, { ok: true, data: events.history(Number(url.searchParams.get('limit') || 100)) })
    if (request.method === 'GET' && url.pathname === '/api/logs') return json(response, 200, { ok: true, data: service.logs(Number(url.searchParams.get('limit') || 200)) })
    if (request.method === 'GET' && url.pathname === '/api/destinations') return json(response, 200, { ok: true, data: service.listDestinations() })
    if (request.method === 'POST' && url.pathname === '/api/destinations') return json(response, 201, { ok: true, data: await service.createDestination(await body(request) as DestinationState) })
    const destinationMatch = url.pathname.match(/^\/api\/destinations\/([^/]+)$/)
    if (destinationMatch && request.method === 'PATCH') return json(response, 200, { ok: true, data: await service.patchDestination(decodeURIComponent(destinationMatch[1]), await body(request) as Partial<DestinationState>) })
    if (destinationMatch && request.method === 'DELETE') { await service.removeDestination(decodeURIComponent(destinationMatch[1])); return json(response, 204, null) }
    if (request.method === 'GET' && url.pathname === '/api/profiles') return json(response, 200, { ok: true, data: service.listProfiles() })
    if (request.method === 'POST' && url.pathname === '/api/profiles') return json(response, 201, { ok: true, data: await service.createProfile(await body(request) as OutputProfile) })
    if (request.method === 'POST' && url.pathname === '/api/pipeline/start') return json(response, 202, { ok: true, data: service.startPipeline(await body(request) as never) })
    if (request.method === 'POST' && url.pathname === '/api/pipeline/stop') return json(response, 200, { ok: true, data: await service.stopPipeline() })
    return json(response, 404, { ok: false, error: 'Route not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return json(response, message.includes('not found') ? 404 : 422, { ok: false, error: message })
  }
}

async function main(): Promise<void> {
  await service.initialize()
  const server = createServer((request, response) => void route(request, response))
  const sockets = new WebSocketServer({ noServer: true })
  server.on('upgrade', (request, socket, head) => {
    if (new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname !== '/api/events/ws' || !authorized(request)) return socket.destroy()
    sockets.handleUpgrade(request, socket, head, (client) => sockets.emit('connection', client, request))
  })
  sockets.on('connection', (client) => {
    client.send(JSON.stringify({ type: 'runtime.snapshot', timestamp: new Date().toISOString(), payload: service.status() }))
    const unsubscribe = events.subscribe((event) => { if (client.readyState === client.OPEN) client.send(JSON.stringify(event)) })
    client.on('close', unsubscribe)
  })
  server.listen(port, host, () => console.log(`SYCO23 control runtime listening on http://${host}:${port}`))

  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => void service.stopPipeline().finally(() => server.close(() => process.exit(0))))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
