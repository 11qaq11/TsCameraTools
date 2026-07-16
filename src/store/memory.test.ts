import { describe, it, expect } from 'vitest'
import reducer, {
  setStage,
  setDevice,
  setRoot,
  setProcesses,
  setSelected,
  setPolling,
  setInterval,
  setShowSystemMem,
  setDetail,
  setError,
  pushSamples,
  setPeakDmabufBreakdown,
  clearCapture,
} from './memory.js'
import type { Sample, ParsedDumpsys, DmabufPoint, ParsedMeminfo } from '../types/memory'

const initialState = reducer(undefined, { type: '@@INIT' })

describe('memory slice', () => {
  describe('setStage', () => {
    it('设置 stage', () => {
      const state = reducer(initialState, setStage('dashboard'))
      expect(state.stage).toBe('dashboard')
    })
  })

  describe('setDevice', () => {
    it('设置 device 和 serial', () => {
      const device = { serial: 'ABC123', state: 'device' as const, model: 'Pixel' }
      const state = reducer(initialState, setDevice(device))
      expect(state.device).toEqual(device)
      expect(state.serial).toBe('ABC123')
    })

    it('null 清除 device 和 serial', () => {
      const prev = reducer(initialState, setDevice({ serial: 'X', state: 'device' }))
      const state = reducer(prev, setDevice(null))
      expect(state.device).toBeNull()
      expect(state.serial).toBeNull()
    })
  })

  describe('setRoot', () => {
    it('设置 isRoot', () => {
      const state = reducer(initialState, setRoot(true))
      expect(state.isRoot).toBe(true)
    })
  })

  describe('setProcesses', () => {
    it('设置 processes 列表', () => {
      const procs = [
        { name: 'app1', pid: 1001, running: true },
        { name: 'app2', pid: null, running: false },
      ]
      const state = reducer(initialState, setProcesses(procs))
      expect(state.processes).toEqual(procs)
    })
  })

  describe('setSelected', () => {
    it('设置 selectedNames', () => {
      const state = reducer(initialState, setSelected(['app1', 'app2']))
      expect(state.selectedNames).toEqual(['app1', 'app2'])
    })
  })

  describe('setPolling', () => {
    it('设置 polling', () => {
      const state = reducer(initialState, setPolling(true))
      expect(state.polling).toBe(true)
    })
  })

  describe('setInterval', () => {
    it('设置 intervalMs', () => {
      const state = reducer(initialState, setInterval(2000))
      expect(state.intervalMs).toBe(2000)
    })
  })

  describe('setShowSystemMem', () => {
    it('设置 showSystemMem', () => {
      const state = reducer(initialState, setShowSystemMem(true))
      expect(state.showSystemMem).toBe(true)
    })
  })

  describe('setDetail', () => {
    it('设置 detailPid 和 detailName', () => {
      const state = reducer(initialState, setDetail({ pid: 1234, name: 'com.app' }))
      expect(state.detailPid).toBe(1234)
      expect(state.detailName).toBe('com.app')
    })

    it('null 值清除 detail', () => {
      const state = reducer(initialState, setDetail({ pid: null, name: null }))
      expect(state.detailPid).toBeNull()
      expect(state.detailName).toBeNull()
    })
  })

  describe('setError', () => {
    it('设置 errorMessage', () => {
      const state = reducer(initialState, setError('connection failed'))
      expect(state.errorMessage).toBe('connection failed')
    })

    it('null 清除 errorMessage', () => {
      const prev = reducer(initialState, setError('err'))
      const state = reducer(prev, setError(null))
      expect(state.errorMessage).toBeNull()
    })
  })

  describe('pushSamples', () => {
    const makeDumpsys = (name: string, totalPss: number, ts = 1000): Sample => ({
      kind: 'dumpsys',
      name,
      pid: 1001,
      timestamp: ts,
      data: { pid: 1001, totalPss, eglMtrackPss: 0, pssNoEgl: totalPss, totalRss: 0, totalPrivateDirty: 0, totalPrivateClean: 0, totalSwapPss: 0, categories: [] } as ParsedDumpsys,
    })

    const makeDmabuf = (name: string, ionKb: number, ts = 1000): Sample => ({
      kind: 'dmabuf',
      name,
      pid: 1001,
      timestamp: ts,
      data: { pid: 1001, ionKb } as DmabufPoint,
    })

    const makeMeminfo = (ts = 1000): Sample => ({
      kind: 'meminfo',
      name: null,
      pid: null,
      timestamp: ts,
      data: { fields: { MemTotal: 16384000 } } as ParsedMeminfo,
    })

    it('添加 dumpsys sample', () => {
      const state = reducer(initialState, pushSamples([makeDumpsys('app1', 5000)]))
      expect(state.dumpsysByName['app1']).toHaveLength(1)
      expect(state.dumpsysByName['app1'][0].data.totalPss).toBe(5000)
      expect(state.pidByName['app1']).toBe(1001)
    })

    it('更新 peakDumpsys', () => {
      let state = reducer(initialState, pushSamples([makeDumpsys('app1', 5000, 1000)]))
      state = reducer(state, pushSamples([makeDumpsys('app1', 8000, 2000)]))
      expect(state.peakDumpsys['app1'].data.totalPss).toBe(8000)
    })

    it('不更新 peakDumpsys 当新值更小', () => {
      let state = reducer(initialState, pushSamples([makeDumpsys('app1', 8000, 1000)]))
      state = reducer(state, pushSamples([makeDumpsys('app1', 5000, 2000)]))
      expect(state.peakDumpsys['app1'].data.totalPss).toBe(8000)
    })

    it('限制 dumpsys array 长度为 MAX_PER_PID(10)', () => {
      let state = initialState
      for (let i = 0; i < 15; i++) {
        state = reducer(state, pushSamples([makeDumpsys('app1', 1000 + i, 1000 + i)]))
      }
      expect(state.dumpsysByName['app1']).toHaveLength(10)
    })

    it('添加 dmabuf sample', () => {
      const state = reducer(initialState, pushSamples([makeDmabuf('app1', 1024)]))
      expect(state.dmabufByName['app1']).toHaveLength(1)
      expect(state.dmabufByName['app1'][0].data.ionKb).toBe(1024)
    })

    it('更新 peakDmabuf', () => {
      let state = reducer(initialState, pushSamples([makeDmabuf('app1', 512, 1000)]))
      state = reducer(state, pushSamples([makeDmabuf('app1', 2048, 2000)]))
      expect(state.peakDmabuf['app1'].ionKb).toBe(2048)
    })

    it('添加 meminfo sample', () => {
      const state = reducer(initialState, pushSamples([makeMeminfo()]))
      expect(state.systemMem).toHaveLength(1)
      expect(state.systemMem[0].data.fields['MemTotal']).toBe(16384000)
    })

    it('处理多个 samples', () => {
      const samples = [makeDumpsys('a', 1000), makeDmabuf('b', 500), makeMeminfo()]
      const state = reducer(initialState, pushSamples(samples))
      expect(state.dumpsysByName['a']).toHaveLength(1)
      expect(state.dmabufByName['b']).toHaveLength(1)
      expect(state.systemMem).toHaveLength(1)
    })
  })

  describe('setPeakDmabufBreakdown', () => {
    it('设置 peakDmabufBreakdown', () => {
      const breakdown = { pid: 1001, totalKb: 500, groups: [] }
      const state = reducer(initialState, setPeakDmabufBreakdown({ name: 'app1', breakdown }))
      expect(state.peakDmabufBreakdown['app1']).toEqual(breakdown)
    })

    it('设置 null breakdown', () => {
      const state = reducer(initialState, setPeakDmabufBreakdown({ name: 'app1', breakdown: null }))
      expect(state.peakDmabufBreakdown['app1']).toBeNull()
    })
  })

  describe('clearCapture', () => {
    it('清除所有 capture 数据', () => {
      const sample: Sample = {
        kind: 'dumpsys',
        name: 'app1',
        pid: 1001,
        timestamp: 1000,
        data: { pid: 1001, totalPss: 5000, eglMtrackPss: 0, pssNoEgl: 5000, totalRss: 0, totalPrivateDirty: 0, totalPrivateClean: 0, totalSwapPss: 0, categories: [] } as ParsedDumpsys,
      }
      let state = reducer(initialState, pushSamples([sample]))
      state = reducer(state, setError('some error'))
      state = reducer(state, clearCapture())

      expect(state.dumpsysByName).toEqual({})
      expect(state.dmabufByName).toEqual({})
      expect(state.pidByName).toEqual({})
      expect(state.systemMem).toEqual([])
      expect(state.peakDumpsys).toEqual({})
      expect(state.peakDmabuf).toEqual({})
      expect(state.peakDmabufBreakdown).toEqual({})
      expect(state.errorMessage).toBeNull()
    })

    it('不影响非 capture 状态', () => {
      let state = reducer(initialState, setStage('dashboard'))
      state = reducer(state, setSelected(['app1']))
      state = reducer(state, clearCapture())
      expect(state.stage).toBe('dashboard')
      expect(state.selectedNames).toEqual(['app1'])
    })
  })
})
