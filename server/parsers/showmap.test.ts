import { describe, it, expect } from 'vitest'
import { parseShowmap } from './showmap.js'

describe('parseShowmap', () => {
  it('解析简短格式行', () => {
    const output = `102400 51200 25600 12800 6400 3200 libc.so`
    const result = parseShowmap(1001, output)
    expect(result.pid).toBe(1001)
    expect(result.mappings).toHaveLength(1)
    expect(result.mappings[0].vss).toBe(102400)
    expect(result.mappings[0].rss).toBe(51200)
    expect(result.mappings[0].pss).toBe(25600)
    expect(result.mappings[0].dirty).toBe(3200)
  })

  it('解析多行并按 pss 降序排列', () => {
    const output = `100 50 10 5 0 3 obj_a
200 100 50 10 0 6 obj_b`
    const result = parseShowmap(1002, output)
    expect(result.mappings).toHaveLength(2)
    expect(result.mappings[0].pss).toBeGreaterThanOrEqual(result.mappings[1].pss)
    expect(result.mappings[0].pss).toBe(50)
  })

  it('限制 top 30', () => {
    const lines = Array.from({ length: 50 }, (_, i) =>
      `${100 + i} ${50 + i} ${10 + i} 5 0 3 obj_${i}`
    ).join('\n')
    const result = parseShowmap(1003, lines)
    expect(result.mappings).toHaveLength(30)
  })

  it('跳过 header 和 separator 行', () => {
    const output = `virtual size RSS PSS
--- --- ---
100 50 10 5 0 3 obj_a`
    const result = parseShowmap(1004, output)
    expect(result.mappings).toHaveLength(1)
  })

  it('空输出返回空 mappings', () => {
    const result = parseShowmap(1005, '')
    expect(result.mappings).toEqual([])
  })

  it('跳过字段不足的行', () => {
    const output = 'a b c\n100 50 10 5 0 3 obj_a\n'
    const result = parseShowmap(1006, output)
    expect(result.mappings).toHaveLength(1)
  })

  it('从标准 header 输出中提取 vss/rss/pss', () => {
    const output = `virtual                     shared   shared  private  private
       size     RSS      PSS    clean    dirty    clean    dirty     swap  swapPSS   flags  object
----------  ------  ------  ------  ------  ------  ------  ------  ------  -----  ------
    102400    51200   25600   12800    6400    3200    1600       0       0  -----  libc.so`
    const result = parseShowmap(1001, output)
    expect(result.mappings).toHaveLength(1)
    // Parser extracts vss/rss/pss from first 3 columns
    expect(result.mappings[0].vss).toBe(102400)
    expect(result.mappings[0].rss).toBe(51200)
    expect(result.mappings[0].pss).toBe(25600)
  })
})
