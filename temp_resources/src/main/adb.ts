import { spawn, execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { delimiter } from 'node:path'
import type { AdbEnvCheck, UsbDriverCheck, DeviceInfo } from '../shared/types'

const execFileAsync = promisify(execFile)

/** 系统已知可能安装 adb 的路径（Windows 优先，兼容 POSIX） */
const ADB_CANDIDATES = process.platform === 'win32'
  ? ['C:\\adb\\adb.exe', 'C:\\platform-tools\\adb.exe']
  : ['/usr/bin/adb', '/usr/local/bin/adb', '/opt/platform-tools/adb']

/** 在 PATH 或已知路径中定位 adb 可执行文件 */
function locateAdb(): string | null {
  const ext = process.platform === 'win32' ? ['exe', ''] : ['']
  const pathDirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean)
  for (const dir of pathDirs) {
    for (const e of ext) {
      const p = e ? `${dir}\\adb.${e}` : `${dir}/adb`
      if (p && existsSync(p)) return p
    }
  }
  for (const p of ADB_CANDIDATES) {
    if (existsSync(p)) return p
  }
  return null
}

/** 检查 adb 环境：定位 + 版本。失败时 ok=false */
export async function checkAdbEnv(): Promise<AdbEnvCheck> {
  const adbPath = locateAdb()
  if (!adbPath) {
    return {
      ok: false,
      reason: '未找到 adb。请先安装 Android Platform Tools，并确保 adb 在 PATH 或位于 C:\\adb\\adb.exe。'
    }
  }
  try {
    const { stdout } = await execFileAsync(adbPath, ['version'])
    const line = stdout.split(/\r?\n/).find((l) => l.includes('Android Debug Bridge')) ?? ''
    return { ok: true, adbPath, version: line.trim() }
  } catch (e) {
    return { ok: false, reason: `adb 定位到 ${adbPath}，但执行失败：${(e as Error).message}` }
  }
}

/**
 * 检测 Windows 是否安装了 ADB USB 驱动（非管理员可用）。
 * 主路径：注册表 HKLM\SYSTEM\CurrentControlSet\Control\Class 下查找
 *   AndroidUsbDeviceClass 或 DriverDesc 含 "ADB Interface"。
 * 辅路径：DriverStore\FileRepository 下存在 android_usb / *adb*.inf 目录。
 * 非 Windows 视为通过（依赖系统自带的 libusb / 内核驱动）。
 */
export async function checkUsbDriver(): Promise<UsbDriverCheck> {
  if (process.platform !== 'win32') {
    return { ok: true, reason: '非 Windows 平台，跳过 USB 驱动检测' }
  }
  try {
    // 主路径：注册表 Class 枚举（reg query /s /f 子串匹配）
    const { stdout } = await execFileAsync('reg', [
      'query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class', '/s', '/f', 'AndroidUsbDeviceClass'
    ])
    if (stdout.includes('AndroidUsbDeviceClass')) {
      return { ok: true, reason: '检测到 AndroidUsbDeviceClass' }
    }
    // 备选：DriverDesc 含 ADB Interface
    const { stdout: s2 } = await execFileAsync('reg', [
      'query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class', '/s', '/f', 'ADB Interface'
    ])
    if (s2.includes('ADB Interface')) {
      return { ok: true, reason: '检测到 ADB Interface 驱动' }
    }
    // 辅路径：DriverStore 目录
    const { stdout: s3 } = await execFileAsync('cmd', ['/c', 'dir', '/b', 'C:\\Windows\\System32\\DriverStore\\FileRepository'])
    const lines = s3.split(/\r?\n/).map((l) => l.trim().toLowerCase())
    if (lines.some((l) => /android_usb|android_winusb|.*adb.*\.inf/.test(l))) {
      return { ok: true, reason: 'DriverStore 中存在 Android/ADB 驱动 INF' }
    }
    return { ok: false, reason: '未检测到 Android ADB USB 驱动。请安装设备厂商 USB 驱动或 Google USB Driver。' }
  } catch (e) {
    return { ok: false, reason: `USB 驱动检测异常：${(e as Error).message}` }
  }
}

/** 当前锁定的设备 serial（setSerial 后所有 shell 命令带 --serial） */
let currentSerial: string | null = null
let adbPath: string | null = null

/** 由 main/index 在 adb 环境检查通过后注入路径 */
export function setAdbPath(p: string): void {
  adbPath = p
}

export function setSerial(serial: string | null): void {
  currentSerial = serial
}

/** 当前锁定的设备 serial（供 poller facade 传给 worker——worker 有独立模块实例，需单独注入） */
export function getSerial(): string | null {
  return currentSerial
}

/** 获取已注入的 adb 路径（调用前需确保 checkAdbEnv 通过） */
export function getAdbPath(): string {
  if (!adbPath) throw new Error('adb 未初始化，请先通过环境检查')
  return adbPath
}

/** adb devices -l 解析 */
export async function listDevices(): Promise<DeviceInfo[]> {
  const { stdout } = await execFileAsync(getAdbPath(), ['devices', '-l'])
  const devices: DeviceInfo[] = []
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(/^(\S+)\s+(\S+)\s+(.*)$/)
    if (!m) continue
    const [, serial, state, rest] = m
    if (serial === 'List' || state === 'of') continue
    if (state === 'device' || state === 'unauthorized' || state === 'offline') {
      const model = rest.match(/model:(\S+)/)?.[1]
      const product = rest.match(/product:(\S+)/)?.[1]
      devices.push({ serial, state, model, product })
    }
  }
  return devices
}

/**
 * 执行一条 adb shell 命令，返回 stdout 文本。
 * root 命令（dmabuf_dump 等）在设备 adb shell 已为 root 时直接生效。
 */
export async function shell(cmd: string): Promise<string> {
  const args = currentSerial ? ['-s', currentSerial, 'shell', cmd] : ['shell', cmd]
  const { stdout } = await execFileAsync(getAdbPath(), args, { maxBuffer: 64 * 1024 * 1024 })
  return stdout
}

/** 检测 adb shell 是否为 root（id 输出含 uid=0） */
export async function isShellRoot(): Promise<boolean> {
  try {
    const out = await shell('id')
    return /uid=0\(root\)/.test(out)
  } catch {
    return false
  }
}

/**
 * 轻量 PID 查询：仅用 pidof，不带 ps 回退。
 * 供轮询每 tick 重解 PID 用——未运行时 pidof 立即返回空/退出码 1，
 * 不会触发慢速 `ps -A | grep`，保证 1s 节拍下动态 PID 检测不拖慢抓取。
 * 找不到（含退出码 1）统一返回 null。
 */
export async function pidOfFast(name: string): Promise<number | null> {
  if (!/^[A-Za-z0-9._@-]+$/.test(name)) return null
  try {
    const out = await shell(`pidof ${name}`)
    const pid = out.trim().split(/\s+/)[0]
    if (pid && /^\d+$/.test(pid)) return Number(pid)
    return null
  } catch {
    return null
  }
}
