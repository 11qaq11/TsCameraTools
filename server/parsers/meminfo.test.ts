import { describe, it, expect } from 'vitest'
import { parseMeminfo } from './meminfo.js'

const SAMPLE_OUTPUT = `MemTotal:       16384000 kB
MemFree:         2048000 kB
MemAvailable:    8192000 kB
Buffers:          512000 kB
Cached:          4096000 kB
SwapTotal:       2097152 kB
SwapFree:        1048576 kB
`

describe('parseMeminfo', () => {
  it('解析所有字段', () => {
    const result = parseMeminfo(SAMPLE_OUTPUT)
    expect(result.fields['MemTotal']).toBe(16384000)
    expect(result.fields['MemFree']).toBe(2048000)
    expect(result.fields['MemAvailable']).toBe(8192000)
    expect(result.fields['Buffers']).toBe(512000)
    expect(result.fields['Cached']).toBe(4096000)
    expect(result.fields['SwapTotal']).toBe(2097152)
    expect(result.fields['SwapFree']).toBe(1048576)
  })

  it('跳过空行', () => {
    const output = 'MemTotal: 1000 kB\n\n\nMemFree: 500 kB\n'
    const result = parseMeminfo(output)
    expect(Object.keys(result.fields)).toHaveLength(2)
  })

  it('空输出返回空 fields', () => {
    const result = parseMeminfo('')
    expect(result.fields).toEqual({})
  })

  it('忽略格式错误的行', () => {
    const output = 'bad line\nMemTotal: 1000 kB\n'
    const result = parseMeminfo(output)
    expect(result.fields['MemTotal']).toBe(1000)
    expect(Object.keys(result.fields)).toHaveLength(1)
  })

  it('字段名支持括号', () => {
    const output = 'VmallocUsed:    12345 kB\n'
    const result = parseMeminfo(output)
    expect(result.fields['VmallocUsed']).toBe(12345)
  })
})
