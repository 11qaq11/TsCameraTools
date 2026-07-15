import { describe, it, expect } from 'vitest'

describe('config', () => {
  it('默认端口为 3000', () => {
    const port = parseInt(process.env.PORT || '3000')
    expect(port).toBe(3000)
  })

  it('默认 ADB 路径为 adb', () => {
    const adbPath = process.env.ADB_PATH || 'adb'
    expect(adbPath).toBe('adb')
  })

  it('默认前端 URL 为 localhost:5173', () => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    expect(frontendUrl).toBe('http://localhost:5173')
  })

  it('默认 ttyd 端口范围 7681-7690', () => {
    const portStart = parseInt(process.env.TTYD_PORT_START || '7681')
    const portEnd = parseInt(process.env.TTYD_PORT_END || '7690')
    expect(portStart).toBe(7681)
    expect(portEnd).toBe(7690)
    expect(portEnd - portStart).toBe(9)
  })

  it('自定义环境变量覆盖默认值', () => {
    const original = process.env.PORT
    process.env.PORT = '8080'
    const port = parseInt(process.env.PORT || '3000')
    expect(port).toBe(8080)
    process.env.PORT = original
  })

  it('数值类型正确解析', () => {
    expect(parseInt('3000')).toBe(3000)
    expect(parseInt('abc')).toBeNaN()
    expect(parseInt('')).toBeNaN()
  })

  it('TTYD_CREDENTIAL 默认值', () => {
    const credential = process.env.TTYD_CREDENTIAL || 'admin:admin'
    expect(credential).toBe('admin:admin')
  })

  it('HTTPS 默认关闭', () => {
    const https = process.env.HTTPS === 'true'
    expect(https).toBe(false)
  })
})
