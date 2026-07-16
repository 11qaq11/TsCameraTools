import { describe, it, expect } from 'vitest'
import { parseDmabufDump } from './dmabuf-dump.js'

describe('parseDmabufDump', () => {
  it('解析 size: 格式', () => {
    const output = 'size: 4096\nsize: 4096\nsize: 8192\n'
    const result = parseDmabufDump(1001, output)
    expect(result.pid).toBe(1001)
    expect(result.totalKb).toBe(16) // 4+4+8
    expect(result.groups).toHaveLength(2)
    const g4 = result.groups.find(g => g.sizeKb === 4)
    expect(g4).toBeDefined()
    expect(g4!.count).toBe(2)
    expect(g4!.totalKb).toBe(8)
  })

  it('解析列格式', () => {
    const output = '0  exp_name  4096  100\n1  exp_name  8192  200\n'
    const result = parseDmabufDump(1002, output)
    expect(result.pid).toBe(1002)
    expect(result.totalKb).toBe(12) // 4+8
  })

  it('跳过注释和分隔线', () => {
    const output = '# comment\n---\nsize: 4096\n'
    const result = parseDmabufDump(1003, output)
    expect(result.totalKb).toBe(4)
  })

  it('跳过空行', () => {
    const output = '\n\nsize: 4096\n\n'
    const result = parseDmabufDump(1004, output)
    expect(result.totalKb).toBe(4)
  })

  it('空输出返回零值', () => {
    const result = parseDmabufDump(1005, '')
    expect(result.totalKb).toBe(0)
    expect(result.groups).toEqual([])
  })

  it('groups 按 totalKb 降序排列', () => {
    const output = 'size: 1024\nsize: 4096\nsize: 2048\n'
    const result = parseDmabufDump(1006, output)
    for (let i = 1; i < result.groups.length; i++) {
      expect(result.groups[i - 1].totalKb).toBeGreaterThanOrEqual(result.groups[i].totalKb)
    }
  })
})
