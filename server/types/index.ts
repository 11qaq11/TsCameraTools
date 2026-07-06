export interface User {
  id: string
  name: string
  email: string
  avatar: string
  tenantKey: string
}

export interface AdbDevice {
  serial: string
  model: string
  status: 'device' | 'offline' | 'unauthorized'
}

export interface ShellSession {
  id: string
  serial: string
  userId: string
  startTime: number
}

export interface AdbResult {
  success: boolean
  message: string
  data?: unknown
}
