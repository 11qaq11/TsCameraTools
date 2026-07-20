import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import type { ProcessEntry } from '../shared/types'

const STORE_FILE = 'processes.json'

/** 存储版本：version<3 为旧版（旧别名/10 条），需迁移到 cmf 对齐的 19 条 catalog */
const STORE_VERSION = 3

/** 进程名安全校验：仅允许字母/数字/._-@，防止拼入 adb shell 时命令注入 */
export function isValidProcessName(name: string): boolean {
  return /^[A-Za-z0-9._@-]+$/.test(name)
}

/**
 * 内置监控进程 catalog（逐条对齐 camera-memory-fetcher proclist.txt 全 19 条：进程名 + 动态标记 + 显示名）。
 * alias 取 cmf proclist 的显示名（= 左侧），使本工具导出 sheet 名与 cmf CSV 列前缀一致，可直接对照。
 * dynamic=true 对应 proclist 的 `?` 后缀（APP/GALLERY/ALGO/CAM0_ALLOC_BUF，PID 随启停变化，每 tick 重解）；
 * 其余为 boot 服务，解析一次后缓存。category 仅用于 UI 排序（cmf 无此概念）。MTK/qcom 平台相关条目未运行时自动填 0。
 */
const DEFAULT_PROCESSES: ProcessEntry[] = [
  // app —— 动态（用户可启停）
  { name: 'com.android.camera', alias: 'APP', dynamic: true, category: 'app' },
  { name: 'com.vivo.gallery', alias: 'GALLERY', dynamic: true, category: 'app' },
  // algo —— 动态
  { name: 'com.vivo.vivo3rdalgoservice', alias: 'ALGO', dynamic: true, category: 'algo' },
  { name: 'cam0_alloc_buf', alias: 'CAM0_ALLOC_BUF', dynamic: true, category: 'kernel' },
  // service —— 静态（boot 服务）
  { name: 'cameraserver', alias: 'SERVER', dynamic: false, category: 'service' },
  { name: 'camerahalserver', alias: 'HALSERVER', dynamic: false, category: 'service' },
  { name: 'vivocameraserver', alias: 'VIVOSERVER', dynamic: false, category: 'service' },
  // provider —— 静态
  { name: 'vendor.vivo.hardware.camera3rd.provider@1.0-service', alias: 'CAMERA3D', dynamic: false, category: 'provider' },
  { name: 'vendor.vivo.hardware.camera.cameralog@1.0-service', alias: 'CAMERALOG', dynamic: false, category: 'provider' },
  { name: 'vendor.vivo.hardware.nativecamera.provider@1.0-service', alias: 'VIVOPROVIDER', dynamic: false, category: 'provider' },
  { name: 'vendor.vivo.hardware.osccamera.provider@1.0-service', alias: 'OSCPROVIDER', dynamic: false, category: 'provider' },
  { name: 'android.hardware.camera.provider@2.4-service', alias: 'PROVIDER', dynamic: false, category: 'provider' },
  { name: 'android.hardware.camera.provider@2.4-service_64', alias: 'PROVIDER64', dynamic: false, category: 'provider' },
  { name: 'vendor.qti.camera.provider@2.7-service_64', alias: 'PROVIDER27_64', dynamic: false, category: 'provider' },
  { name: 'vendor.qti.camera.provider-service_64', alias: 'PROVIDER_64', dynamic: false, category: 'provider' },
  // allocator —— 静态（gralloc/ion 归属）
  { name: 'android.hardware.graphics.allocator@4.0-service-mediatek', alias: 'ALLOCATOR_MTK', dynamic: false, category: 'allocator' },
  { name: 'android.hardware.graphics.allocator-V2-service-mediatek', alias: 'ALLOCATOR_MTK_V2', dynamic: false, category: 'allocator' },
  { name: 'android.hardware.graphics.allocator@4.0-service', alias: 'ALLOCATOR', dynamic: false, category: 'allocator' },
  { name: 'vendor.qti.hardware.display.allocator-service', alias: 'GRALLOC', dynamic: false, category: 'allocator' }
]

function storePath(): string {
  // 跨会话持久：Electron userData 目录
  return join(app.getPath('userData'), STORE_FILE)
}

/** catalog 名集合，用于迁移时识别用户自增条目 */
const CATALOG_NAMES = new Set(DEFAULT_PROCESSES.map((e) => e.name))

/** 防御性补全：确保每条都有 dynamic（缺省 true，与历史「每 tick 重解」行为一致） */
function withDefaults(list: ProcessEntry[]): ProcessEntry[] {
  return list.map((e) => ({ ...e, dynamic: e.dynamic ?? true }))
}

/** 读取已配置进程列表（首次启动不存在则写入默认；旧版自动迁移到 v2 catalog） */
export function readProcesses(): ProcessEntry[] {
  const p = storePath()
  if (!existsSync(p)) {
    writeProcesses(DEFAULT_PROCESSES)
    return DEFAULT_PROCESSES.map((e) => ({ ...e }))
  }
  try {
    const data = JSON.parse(readFileSync(p, 'utf-8'))
    // 旧版（无 version 或 version<3，含旧别名/10 条列表）：重置为 cmf 对齐的 19 条 catalog，
    // 并保留用户自增条目（dynamic=true）。catalog 条目 alias 被重置为 cmf 显示名。
    if (data?.version !== STORE_VERSION) {
      const legacy = Array.isArray(data?.processes) ? (data.processes as ProcessEntry[]) : []
      const userAdded = legacy.filter((e) => e && e.name && !CATALOG_NAMES.has(e.name))
      const merged = [...DEFAULT_PROCESSES.map((e) => ({ ...e })), ...withDefaults(userAdded)]
      writeProcesses(merged)
      return merged
    }
    // v3：原样返回，仅防御性补 dynamic
    if (Array.isArray(data?.processes)) return withDefaults(data.processes as ProcessEntry[])
    return []
  } catch {
    return []
  }
}

/** 写回进程列表（带版本号） */
export function writeProcesses(list: ProcessEntry[]): void {
  const p = storePath()
  const dir = join(p, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(p, JSON.stringify({ version: STORE_VERSION, processes: list }, null, 2), 'utf-8')
}

/** 恢复默认进程列表（19 条 catalog，丢弃用户增删） */
export function resetProcesses(): ProcessEntry[] {
  writeProcesses(DEFAULT_PROCESSES)
  return DEFAULT_PROCESSES.map((e) => ({ ...e }))
}

export function addProcess(name: string, alias?: string, note?: string, dynamic?: boolean): ProcessEntry[] {
  const list = readProcesses()
  const trimmed = name.trim()
  if (!trimmed) throw new Error('进程名不能为空')
  if (!isValidProcessName(trimmed)) {
    throw new Error('进程名仅允许字母、数字、. _ @ -')
  }
  if (list.some((e) => e.name === trimmed)) throw new Error(`进程 ${trimmed} 已存在`)
  // 用户自增进程默认动态（可能启停），与历史行为一致
  list.push({ name: trimmed, alias: alias?.trim() || undefined, note: note?.trim() || undefined, dynamic: dynamic ?? true })
  writeProcesses(list)
  return list
}

export function removeProcess(name: string): ProcessEntry[] {
  const list = readProcesses().filter((e) => e.name !== name)
  writeProcesses(list)
  return list
}
