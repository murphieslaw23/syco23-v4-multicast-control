import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDatabase, getDb, initDatabase } from '../../server/db'
import { insertLog, logsToCsv, queryLogs } from '../../server/dao/logs'

describe('log query and export', () => {
  beforeEach(async () => { closeDatabase(); await initDatabase() })
  afterEach(() => closeDatabase())

  it('filters, paginates, and exports logs', () => {
    const db = getDb()
    insertLog(db, { level: 'info', source: 'runtime', message: 'started' })
    insertLog(db, { level: 'error', source: 'worker', message: 'failed output' })
    const page = queryLogs(db, { level: 'error', search: 'output', limit: 1 })
    expect(page.total).toBe(1)
    expect(page.items[0].source).toBe('worker')
    expect(logsToCsv(page.items)).toContain('failed output')
  })
})
