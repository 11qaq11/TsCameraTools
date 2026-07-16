import { describe, it, expect } from 'vitest'
import { parseMeminfoIon } from './meminfo-ion.js'

describe('parseMeminfoIon', () => {
  it('解析空格分隔格式', () => {
    const output = '1001 512\n1002 1024\n1003 2048\n'
    const result = parseMeminfoIon(output)
    expect(result.size).toBe(3)
    expect(result.get(1001)).toBe(512)
    expect(result.get(1002)).toBe(1024)
    expect(result.get(1003)).toBe(2048)
  })

  it('解析冒号分隔格式', () => {
    const output = '1001:512\n1002:1024\n'
    const result = parseMeminfoIon(output)
    expect(result.size).toBe(2)
    expect(result.get(1001)).toBe(512)
    expect(result.get(1002)).toBe(1024)
  })

  it('跳过注释行', () => {
    const output = '# comment\n1001 512\n# another\n1002 1024\n'
    const result = parseMeminfoIon(output)
    expect(result.size).toBe(2)
  })

  it('跳过空行', () => {
    const output = '\n1001 512\n\n\n1002 1024\n'
    const result = parseMeminfoIon(output)
    expect(result.size).toBe(2)
  })

  it('空输出返回空 Map', () => {
    const result = parseMeminfoIon('')
    expect(result.size).toBe(0)
  })

  it('忽略格式错误的行', () => {
    const output = 'abc def\n1001 512\n'
    const result = parseMeminfoIon(output)
    expect(result.size).toBe(1)
    expect(result.get(1001)).toBe(512)
  })
})
