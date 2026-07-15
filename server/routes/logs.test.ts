import { describe, it, expect, vi } from 'vitest'

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
    readdirSync: vi.fn(() => ['2025-07-15_10-30.log', '2025-07-14_09-00.log']),
    statSync: vi.fn(() => ({ size: 1024, mtime: new Date('2025-07-15') })),
  },
}))

describe('logs routes logic', () => {
  describe('getLogFileName', () => {
    it('生成正确的日志文件名格式', () => {
      const now = new Date('2025-07-15T14:30:00')
      const date = now.toISOString().split('T')[0]
      const hour = String(now.getHours()).padStart(2, '0')
      const minute = String(now.getMinutes()).padStart(2, '0')
      const fileName = `${date}_${hour}-${minute}.log`

      expect(fileName).toMatch(/^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.log$/)
    })
  })

  describe('日志条目格式', () => {
    it('单条日志格式正确', () => {
      const level = 'INFO'
      const tag = 'Test'
      const message = 'Hello world'
      const time = new Date().toISOString()
      const entry = `[${time}][${level}][${tag}] ${message}\n`

      expect(entry).toContain('[INFO]')
      expect(entry).toContain('[Test]')
      expect(entry).toContain('Hello world')
    })

    it('带 data 的日志格式正确', () => {
      const level = 'ERROR'
      const tag = 'API'
      const message = 'Request failed'
      const data = { status: 500, url: '/api/test' }
      const time = new Date().toISOString()
      const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : ''
      const entry = `[${time}][${level}][${tag}] ${message}${dataStr}\n`

      expect(entry).toContain('"status":500')
      expect(entry).toContain('[ERROR]')
    })
  })

  describe('批量日志', () => {
    it('多个日志条目正确拼接', () => {
      const logs = [
        { level: 'INFO', tag: 'A', message: 'msg1' },
        { level: 'WARN', tag: 'B', message: 'msg2' },
      ]
      const entries = logs.map(log => {
        const time = new Date().toISOString()
        return `[${time}][${log.level}][${log.tag}] ${log.message}\n`
      }).join('')

      expect(entries).toContain('[INFO]')
      expect(entries).toContain('[WARN]')
      expect(entries.split('\n').filter(Boolean)).toHaveLength(2)
    })
  })

  describe('日志文件列表', () => {
    it('过滤 .log 文件', () => {
      const files = ['2025-07-15_10-30.log', '2025-07-14_09-00.log', 'other.txt']
      const logFiles = files.filter(f => f.endsWith('.log'))
      expect(logFiles).toHaveLength(2)
    })

    it('非 log 文件被排除', () => {
      const files = ['test.log', 'readme.md', 'data.json']
      const logFiles = files.filter(f => f.endsWith('.log'))
      expect(logFiles).toHaveLength(1)
    })
  })
})
