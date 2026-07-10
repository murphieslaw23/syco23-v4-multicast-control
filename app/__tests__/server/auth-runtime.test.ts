import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PersistentDatabase } from '../../server/persistent-db'
import { AuthService } from '../../server/runtime/auth-service'
import { RateLimiter } from '../../server/runtime/rate-limiter'

const req=(cookie?:string)=>({headers:cookie?{cookie,'user-agent':'vitest'}:{'user-agent':'vitest'},socket:{remoteAddress:'127.0.0.1'},method:'GET'} as any)
describe('AuthService',()=>{let dir='';let db:PersistentDatabase;let auth:AuthService
beforeEach(async()=>{dir=await mkdtemp(join(tmpdir(),'syco-auth-'));db=new PersistentDatabase(join(dir,'db.sqlite'));await db.open();auth=new AuthService(db,60000);await auth.initialize()})
afterEach(async()=>{await rm(dir,{recursive:true,force:true})})
it('creates a user and authenticates a cookie session',async()=>{await auth.createUser('operator.one','correct horse battery staple','operator');const login=await auth.login('operator.one','correct horse battery staple',req());const identity=auth.authenticate(req(`syco_session=${encodeURIComponent(login.token)}`));expect(identity?.actor).toBe('operator.one');expect(identity?.role).toBe('operator');expect(identity?.csrfToken).toBeTruthy()})
it('rejects an invalid password',async()=>{await auth.createUser('admin.one','correct horse battery staple','admin');await expect(auth.login('admin.one','wrong password here',req())).rejects.toThrow('Invalid username or password')})})
describe('RateLimiter',()=>{it('blocks after capacity is exhausted',()=>{const limiter=new RateLimiter(2,0.01);expect(limiter.consume('a').allowed).toBe(true);expect(limiter.consume('a').allowed).toBe(true);expect(limiter.consume('a').allowed).toBe(false)})})

describe('AuthService account lifecycle',()=>{let dir='';let db:PersistentDatabase;let auth:AuthService
beforeEach(async()=>{dir=await mkdtemp(join(tmpdir(),'syco-auth-life-'));db=new PersistentDatabase(join(dir,'db.sqlite'));await db.open();auth=new AuthService(db,60000);await auth.initialize()})
afterEach(async()=>{await rm(dir,{recursive:true,force:true})})
it('disables a user and revokes active sessions',async()=>{const user=await auth.createUser('viewer.one','correct horse battery staple','viewer');const login=await auth.login('viewer.one','correct horse battery staple',req());expect(auth.authenticate(req(`syco_session=${encodeURIComponent(login.token)}`))).not.toBeNull();await auth.updateUser(user.id,{enabled:false});expect(auth.authenticate(req(`syco_session=${encodeURIComponent(login.token)}`))).toBeNull();expect(auth.listUsers().find(item=>item.id===user.id)?.enabled).toBe(false)})
it('resets a password and invalidates prior sessions',async()=>{const user=await auth.createUser('operator.two','correct horse battery staple','operator');const login=await auth.login('operator.two','correct horse battery staple',req());await auth.resetPassword(user.id,'a different secure password');expect(auth.authenticate(req(`syco_session=${encodeURIComponent(login.token)}`))).toBeNull();await expect(auth.login('operator.two','correct horse battery staple',req())).rejects.toThrow();await expect(auth.login('operator.two','a different secure password',req())).resolves.toBeTruthy()})
it('lists and selectively revokes sessions',async()=>{const user=await auth.createUser('admin.two','correct horse battery staple','admin');const first=await auth.login('admin.two','correct horse battery staple',req());const second=await auth.login('admin.two','correct horse battery staple',req());const sessions=auth.listSessions(first.identity.sessionId,user.id);expect(sessions).toHaveLength(2);expect(sessions.some(item=>item.current)).toBe(true);const target=sessions.find(item=>!item.current)!;await auth.revokeSession(target.id);expect(auth.authenticate(req(`syco_session=${encodeURIComponent(second.token)}`))).toBeNull();expect(auth.authenticate(req(`syco_session=${encodeURIComponent(first.token)}`))).not.toBeNull()})})
