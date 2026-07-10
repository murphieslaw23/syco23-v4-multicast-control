import { describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('server/db', () => {
  beforeEach(async () => {
    const { initDatabase, closeDatabase } = await import('../../server/db')
    closeDatabase()
    await initDatabase()
  })

  afterEach(async () => {
    const { closeDatabase } = await import('../../server/db')
    closeDatabase()
  })

  it('initializes successfully', async () => {
    const { isDbReady } = await import('../../server/db')
    expect(isDbReady()).toBe(true)
  })

  it('creates all 10 required tables', async () => {
    const { getDb } = await import('../../server/db')
    const db = getDb()
    const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    const tables = result[0].values.map((v) => v[0] as string)
    expect(tables).toContain('streams')
    expect(tables).toContain('destinations')
    expect(tables).toContain('output_profiles')
    expect(tables).toContain('templates')
    expect(tables).toContain('transmission_kits')
    expect(tables).toContain('schedules')
    expect(tables).toContain('log_entries')
    expect(tables).toContain('metadata_snapshots')
    expect(tables).toContain('watchdog_events')
    expect(tables).toContain('user_assets')
  })

  it('enables foreign keys', async () => {
    const { getDb } = await import('../../server/db')
    const db = getDb()
    const result = db.exec('PRAGMA foreign_keys')
    expect(result[0].values[0][0]).toBe(1)
  })

  it('enables WAL journal mode', async () => {
    const { getDb } = await import('../../server/db')
    const db = getDb()
    const result = db.exec('PRAGMA journal_mode')
    expect(result[0].values[0][0]).toBe('wal')
  })

  it('exports database as Uint8Array', async () => {
    const { exportDatabase } = await import('../../server/db')
    const data = exportDatabase()
    expect(data).toBeInstanceOf(Uint8Array)
    expect(data.length).toBeGreaterThan(0)
  })

  it('imports database from Uint8Array', async () => {
    const { exportDatabase, importDatabase, isDbReady } = await import('../../server/db')
    const data = exportDatabase()

    const { closeDatabase } = await import('../../server/db')
    closeDatabase()
    expect(isDbReady()).toBe(false)

    importDatabase(data)
    expect(isDbReady()).toBe(true)
  })

  it('returns error when accessing db before init', async () => {
    const { closeDatabase, getDb } = await import('../../server/db')
    closeDatabase()

    expect(() => getDb()).toThrow('Database not initialized')
  })

  it('closes database cleanly', async () => {
    const { closeDatabase, isDbReady } = await import('../../server/db')
    expect(isDbReady()).toBe(true)
    closeDatabase()
    expect(isDbReady()).toBe(false)
  })

  it('handles basic CRUD operations', async () => {
    const { getDb } = await import('../../server/db')
    const db = getDb()

    // Insert
    db.run(
      "INSERT INTO destinations (id, provider, label, protocol, endpoint_url, stream_key_ref, status, video_profile, audio_profile, monitor_mode, requires_manual_setup) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['test-1', 'youtube', 'Test', 'rtmps', 'rtmp://test', 'key-1', 'configured', '1080p', '128k', 'rtmp-output', 0]
    )

    // Read
    const result = db.exec('SELECT * FROM destinations WHERE id = ?', ['test-1'])
    expect(result[0].values).toHaveLength(1)
    expect(result[0].values[0][1]).toBe('youtube')

    // Update
    db.run('UPDATE destinations SET status = ? WHERE id = ?', ['live', 'test-1'])
    const updated = db.exec('SELECT status FROM destinations WHERE id = ?', ['test-1'])
    expect(updated[0].values[0][0]).toBe('live')

    // Delete
    db.run('DELETE FROM destinations WHERE id = ?', ['test-1'])
    const deleted = db.exec('SELECT * FROM destinations WHERE id = ?', ['test-1'])
    expect(deleted.length === 0 || deleted[0].values.length === 0).toBe(true)
  })
})
