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
