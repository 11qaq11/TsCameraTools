import type { ParsedMeminfo } from '../../shared/types'

/**
 * 解析 `cat /proc/meminfo` 输出。格式：
 *   MemTotal:        5642436 kB
 *   MemFree:          146092 kB
 */
export function parseMeminfo(stdout: string): ParsedMeminfo {
  const fields: Record<string, number> = {}
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s+(\d+)\s*kB\s*$/)
    if (m) {
      fields[m[1]] = Number(m[2])
    }
  }
  return { fields }
}
