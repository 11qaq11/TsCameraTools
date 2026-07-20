import type { ParsedShowmap, ShowmapMapping } from '../../shared/types'

/**
 * 解析 `showmap <pid>` 输出。
 *
 * 实测设备(vivo/MTK 定制 toybox)格式：16 个指标列(VSS RSS PSS shClean shDirty
 * prClean prDirty swap swapPSS + 6 个大页列 + Locked) + count + object(路径/[anon:...]/TOTAL)，
 * 无地址/权限列。标准 Android showmap 多出 `addr perms offset dev inode` 前缀，
 * 本解析器对两种格式都兼容：取行首连续数字段为指标，首个非数字段起为 object；
 * 若 object 以地址段开头则按标准格式剥离前 5 段取映射名。
 */
export function parseShowmap(stdout: string, pid: number): ParsedShowmap {
  const mappings: ShowmapMapping[] = []

  const lines = stdout.split(/\r?\n/)
  for (const line of lines) {
    const tokens = line.trim().split(/\s+/)
    // 收集行首连续数字段（指标列）
    let i = 0
    while (i < tokens.length && /^\d+$/.test(tokens[i])) i++
    if (i < 7) continue // 不足以解析到 prDirty，跳过表头/分隔线
    const nums = tokens.slice(0, i).map(Number)
    let objStr = tokens.slice(i).join(' ').trim()

    // 标准格式：object = "addr perms offset dev inode name"，剥离前 5 段取映射名
    const std = objStr.match(/^[0-9a-fA-F]+-[0-9a-fA-F]+\s+\S+\s+\S+\s+\S+\s+\S+\s?(.*)$/)
    if (std) objStr = std[1].trim()

    if (objStr === 'TOTAL') continue

    const vss = nums[0]
    const rss = nums[1]
    const pss = nums[2]
    const dirty = (nums[4] ?? 0) + (nums[6] ?? 0) // shared dirty + private dirty

    mappings.push({ name: objStr, vss, rss, pss, dirty })
  }

  // 明细按 pss 降序取 Top 30
  mappings.sort((a, b) => b.pss - a.pss)
  return { pid, mappings: mappings.slice(0, 30) }
}
