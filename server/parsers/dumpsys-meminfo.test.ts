import { describe, it, expect } from 'vitest'
import { parseDumpsysMeminfo } from './dumpsys-meminfo.js'

const SAMPLE_OUTPUT = `
Applications Memory Usage (in Kilobytes):
Uptime: 123456 Realtime: 123456

** MEMINFO in pid 1234 [com.example.app] **
                   Pss  Private  Private  SwapPss      Rss
                 Total    Dirty    Clean    Dirty    Total
                ------   ------   ------   ------   ------
  Native Heap    12000    11000      500      200    15000
  Dalvik Heap     8000     7000      300      100    10000
        Stack      500      500        0        0      600
    EGL mtrack    3000     3000        0        0     3000
   GL mtrack      2000     2000        0        0     2000
      Unknown     1000      800      100       50     1200
        TOTAL    26500    24300      900      350    31800

TOTAL PSS: 26500
TOTAL RSS: 31800
TOTAL PRIVATE DIRTY: 24300
TOTAL PRIVATE CLEAN: 900
TOTAL SWAP PSS: 350

 App Summary
                       Pss(KB)                        Rss(KB)
                        ------                         ------
           Java Heap:     7300                          10000
         Native Heap:    12000                          15000
                Code:      500                           600
               Stack:      500                           600
            Graphics:     5000                          5000
       Private Other:     1050                          1200
              System:      150
`

describe('parseDumpsysMeminfo', () => {
  it('解析 pid', () => {
    const result = parseDumpsysMeminfo(SAMPLE_OUTPUT)
    expect(result.pid).toBe(1234)
  })

  it('解析 TOTAL PSS', () => {
    const result = parseDumpsysMeminfo(SAMPLE_OUTPUT)
    expect(result.totalPss).toBe(26500)
  })

  it('解析 TOTAL RSS', () => {
    const result = parseDumpsysMeminfo(SAMPLE_OUTPUT)
    expect(result.totalRss).toBe(31800)
  })

  it('解析 TOTAL PRIVATE DIRTY', () => {
    const result = parseDumpsysMeminfo(SAMPLE_OUTPUT)
    expect(result.totalPrivateDirty).toBe(24300)
  })

  it('解析 TOTAL PRIVATE CLEAN', () => {
    const result = parseDumpsysMeminfo(SAMPLE_OUTPUT)
    expect(result.totalPrivateClean).toBe(900)
  })

  it('解析 TOTAL SWAP PSS', () => {
    const result = parseDumpsysMeminfo(SAMPLE_OUTPUT)
    expect(result.totalSwapPss).toBe(350)
  })

  it('解析 EGL mtrack PSS', () => {
    const result = parseDumpsysMeminfo(SAMPLE_OUTPUT)
    expect(result.eglMtrackPss).toBe(3000)
  })

  it('计算 pssNoEgl = totalPss - eglMtrackPss', () => {
    const result = parseDumpsysMeminfo(SAMPLE_OUTPUT)
    expect(result.pssNoEgl).toBe(23500)
  })

  it('解析 categories', () => {
    const result = parseDumpsysMeminfo(SAMPLE_OUTPUT)
    expect(result.categories.length).toBeGreaterThanOrEqual(4)
    const native = result.categories.find(c => c.name === 'Native Heap')
    expect(native).toBeDefined()
    expect(native!.pssTotal).toBe(12000)
    expect(native!.privateDirty).toBe(11000)
    expect(native!.rss).toBe(15000)
  })

  it('空输出返回默认值', () => {
    const result = parseDumpsysMeminfo('')
    expect(result.pid).toBe(0)
    expect(result.totalPss).toBe(0)
    expect(result.categories).toEqual([])
  })

  it('无 pid 行时返回 0', () => {
    const output = 'TOTAL    1000    800    200    50    1500\n'
    const result = parseDumpsysMeminfo(output)
    expect(result.pid).toBe(0)
  })
})
