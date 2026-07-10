import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import { WebSocketServer } from 'ws'
import { PersistentDatabase } from './persistent-db'
import { RuntimeEventBus } from './runtime/event-bus'
import { ControlService } from './runtime/control-service'
import { OperationsStore, type Role, type ScheduleJob } from './runtime/operations'
import { SchedulerRuntime } from './runtime/scheduler'
import type { DestinationState, OutputProfile } from '../types'

const port = Number(process.env.PORT || 3000)
const host = process.env.HOST || '0.0.0.0'
const distRoot = resolve(process.cwd(), 'dist')
const persistence = new PersistentDatabase(process.env.SYCO_DB_PATH)
const events = new RuntimeEventBus()
const service = new ControlService(persistence, events)
const operations = new OperationsStore(persistence, events)
const scheduler = new SchedulerRuntime(operations, service, events)

interface AuthContext { actor: string; role: Role }
const rank: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 }

function json(response: ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
  response.end(status === 204 ? undefined : JSON.stringify(data))
}

async function body(request: IncomingMessage, maxBytes = 1_000_000): Promise<unknown> {
  const chunks: Buffer[] = []
  let length = 0
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk)
    length += bytes.length
    if (length > maxBytes) throw new Error(`Request body exceeds ${maxBytes} bytes`)
    chunks.push(bytes)
  }
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function auth(request: IncomingMessage): AuthContext | null {
  const header = request.headers.authorization || ''
  const supplied = header.startsWith('Bearer ') ? header.slice(7) : ''
  const configured: Array<[string | undefined, AuthContext]> = [
    [process.env.SYCO_ADMIN_TOKEN || process.env.SYCO_API_TOKEN, { actor: 'api-admin', role: 'admin' }],
    [process.env.SYCO_OPERATOR_TOKEN, { actor: 'api-operator', role: 'operator' }],
    [process.env.SYCO_VIEWER_TOKEN, { actor: 'api-viewer', role: 'viewer' }],
  ]
  const active = configured.filter(([token]) => Boolean(token))
  if (!active.length) return { actor: 'local-dev', role: 'admin' }
  return active.find(([token]) => token === supplied)?.[1] ?? null
}

function requireRole(context: AuthContext, role: Role): void {
  if (rank[context.role] < rank[role]) throw new Error(`Forbidden: ${role} role required`)
}

function mime(path: string): string {
  return ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' } as Record<string, string>)[extname(path)] || 'application/octet-stream'
}

async function serveStatic(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const raw = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname
  const safe = normalize(raw).replace(/^(\.\.(\/|\\|$))+/, '')
  let path = join(distRoot, safe === '/' ? 'index.html' : safe)
  if (!path.startsWith(distRoot) || !existsSync(path) || (await stat(path)).isDirectory()) path = join(distRoot, 'index.html')
  response.writeHead(200, { 'content-type': mime(path), 'cache-control': path.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' })
  createReadStream(path).pipe(response)
}

async function audited<T>(context: AuthContext, action: string, resource: string, resourceId: string | null, operation: () => Promise<T> | T): Promise<T> {
  try {
    const result = await operation()
    await operations.audit(context.actor, context.role, action, resource, resourceId, 'success')
    return result
  } catch (error) {
    await operations.audit(context.actor, context.role, action, resource, resourceId, 'failure', { error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  if (!url.pathname.startsWith('/api/')) return serveStatic(request, response)
  if (request.method === 'GET' && url.pathname === '/api/health') return json(response, 200, { ok: true, uptime: process.uptime(), timestamp: new Date().toISOString() })
  const context = auth(request)
  if (!context) return json(response, 401, { ok: false, error: 'Unauthorized' })
  try {
    if (request.method === 'GET' && url.pathname === '/api/me') return json(response, 200, { ok: true, data: context })
    if (request.method === 'GET' && url.pathname === '/api/status') return json(response, 200, { ok: true, data: service.status() })
    if (request.method === 'GET' && url.pathname === '/api/events') return json(response, 200, { ok: true, data: events.history(Number(url.searchParams.get('limit') || 100)) })
    if (request.method === 'GET' && url.pathname === '/api/logs') return json(response, 200, { ok: true, data: service.logs(Number(url.searchParams.get('limit') || 200)) })
    if (request.method === 'GET' && url.pathname === '/api/sessions') return json(response, 200, { ok: true, data: service.sessions(Number(url.searchParams.get('limit') || 200)) })
    if (request.method === 'GET' && url.pathname === '/api/audit') { requireRole(context, 'admin'); return json(response, 200, { ok: true, data: operations.listAudit(Number(url.searchParams.get('limit') || 200)) }) }

    if (request.method === 'GET' && url.pathname === '/api/destinations') return json(response, 200, { ok: true, data: service.listDestinations() })
    if (request.method === 'POST' && url.pathname === '/api/destinations') { requireRole(context, 'admin'); const input = await body(request) as DestinationState; return json(response, 201, { ok: true, data: await audited(context, 'create', 'destination', input.id || null, () => service.createDestination(input)) }) }
    const destinationMatch = url.pathname.match(/^\/api\/destinations\/([^/]+)$/)
    if (destinationMatch && request.method === 'PATCH') { requireRole(context, 'admin'); const id=decodeURIComponent(destinationMatch[1]); const patch=await body(request) as Partial<DestinationState>; return json(response, 200, { ok: true, data: await audited(context, 'update', 'destination', id, () => service.patchDestination(id, patch)) }) }
    if (destinationMatch && request.method === 'DELETE') { requireRole(context, 'admin'); const id=decodeURIComponent(destinationMatch[1]); await audited(context, 'delete', 'destination', id, () => service.removeDestination(id)); return json(response, 204, null) }

    if (request.method === 'GET' && url.pathname === '/api/profiles') return json(response, 200, { ok: true, data: service.listProfiles() })
    if (request.method === 'POST' && url.pathname === '/api/profiles') { requireRole(context, 'admin'); const input=await body(request) as OutputProfile; return json(response, 201, { ok: true, data: await audited(context, 'create', 'profile', input.id || null, () => service.createProfile(input)) }) }

    if (request.method === 'POST' && url.pathname === '/api/pipeline/start') { requireRole(context, 'operator'); const input=await body(request) as never; return json(response, 202, { ok: true, data: await audited(context, 'start', 'pipeline', null, () => service.startPipeline(input)) }) }
    if (request.method === 'POST' && url.pathname === '/api/pipeline/stop') { requireRole(context, 'operator'); return json(response, 200, { ok: true, data: await audited(context, 'stop', 'pipeline', null, () => service.stopPipeline()) }) }

    if (request.method === 'GET' && url.pathname === '/api/schedules') return json(response, 200, { ok: true, data: operations.listSchedules() })
    if (request.method === 'POST' && url.pathname === '/api/schedules') { requireRole(context, 'operator'); const input=await body(request) as Omit<ScheduleJob,'id'|'lastRunAt'|'failureCount'|'lastError'>; return json(response, 201, { ok: true, data: await audited(context, 'create', 'schedule', null, () => operations.createSchedule(input)) }) }
    const scheduleMatch=url.pathname.match(/^\/api\/schedules\/([^/]+)$/)
    if(scheduleMatch&&request.method==='DELETE'){requireRole(context,'operator');const id=decodeURIComponent(scheduleMatch[1]);await audited(context,'delete','schedule',id,()=>operations.deleteSchedule(id));return json(response,204,null)}

    if (request.method === 'GET' && url.pathname === '/api/incidents') return json(response, 200, { ok: true, data: operations.listIncidents() })
    const incidentMatch=url.pathname.match(/^\/api\/incidents\/([^/]+)\/resolve$/)
    if(incidentMatch&&request.method==='POST'){requireRole(context,'operator');const id=decodeURIComponent(incidentMatch[1]);const input=await body(request) as {resolution?:string};return json(response,200,{ok:true,data:await audited(context,'resolve','incident',id,()=>operations.resolveIncident(id,input.resolution||''))})}

    if (request.method === 'POST' && url.pathname === '/api/backups') {
      requireRole(context, 'admin')
      const target=resolve(process.env.SYCO_BACKUP_DIR || join(process.cwd(),'data/backups'),`syco23-${new Date().toISOString().replace(/[:.]/g,'-')}.sqlite`)
      await mkdir(dirname(target),{recursive:true})
      const path=await audited(context,'create','backup',null,()=>persistence.backup(target))
      return json(response,201,{ok:true,data:{path}})
    }
    if(request.method==='POST'&&url.pathname==='/api/backups/restore'){
      requireRole(context,'admin')
      const input=await body(request,50_000_000) as {path?:string}
      if(!input.path) throw new Error('Backup path is required')
      const bytes=await readFile(resolve(input.path))
      await audited(context,'restore','backup',null,()=>persistence.restore(new Uint8Array(bytes)))
      await service.initialize()
      return json(response,200,{ok:true,data:{restored:true}})
    }
    if(request.method==='GET'&&url.pathname==='/api/backups/export'){
      requireRole(context,'admin')
      const path=join(process.cwd(),'data',`.export-${crypto.randomUUID()}.sqlite`)
      await persistence.backup(path)
      const bytes=await readFile(path)
      response.writeHead(200,{'content-type':'application/vnd.sqlite3','content-disposition':'attachment; filename="syco23.sqlite"','cache-control':'no-store'})
      response.end(bytes)
      return
    }
    return json(response, 404, { ok: false, error: 'Route not found' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const status = message.startsWith('Forbidden') ? 403 : message.includes('not found') ? 404 : 422
    return json(response, status, { ok: false, error: message })
  }
}

async function main(): Promise<void> {
  await service.initialize()
  scheduler.start()
  const server = createServer((request, response) => void route(request, response))
  const sockets = new WebSocketServer({ noServer: true })
  server.on('upgrade', (request, socket, head) => {
    const url=new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
    if (url.pathname !== '/api/events/ws') return socket.destroy()
    const queryToken=url.searchParams.get('token')||''
    if(queryToken&&!request.headers.authorization) request.headers.authorization=`Bearer ${queryToken}`
    if (!auth(request)) return socket.destroy()
    sockets.handleUpgrade(request, socket, head, (client) => sockets.emit('connection', client, request))
  })
  sockets.on('connection', (client) => {
    client.send(JSON.stringify({ type: 'runtime.snapshot', timestamp: new Date().toISOString(), payload: service.status() }))
    const unsubscribe = events.subscribe((event) => { if (client.readyState === client.OPEN) client.send(JSON.stringify(event)) })
    client.on('close', unsubscribe)
  })
  server.listen(port, host, () => console.log(`SYCO23 control runtime listening on http://${host}:${port}`))
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { scheduler.stop(); void service.stopPipeline().finally(() => server.close(() => process.exit(0))) })
}

main().catch((error) => { console.error(error); process.exit(1) })
