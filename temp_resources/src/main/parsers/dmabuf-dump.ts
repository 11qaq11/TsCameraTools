import type { ParsedDmabufDump, DmabufGroup } from '../../shared/types'

/**
 * 解析 `dmabuf_dump <pid>` 输出（per-process dma-buf fd 持有视图，一次性命令，不进轮询）。
 *
 * 设备实测格式（vivo/MTK，/system/bin/dmabuf_dump）：
 *   <进程名>:<pid>
 *                     Name              Rss              Pss         nr_procs            Inode               Exporter
 *              <bufName>            <Rss> kB            <Pss> kB                1            <inode>                  <exporter>
 *              ...
 *              PROCESS TOTAL            <Rss> kB            <Pss> kB
 *   ----------------------
 *
 * 进程不持有任何 dmabuf fd 时输出 "dmabuf info not found ¯\_(ツ)_/¯"——典型如 ion 分配者进程：
 * 它 ion_alloc 但把 fd 交给客户端、自身不持有，故 meminfo_ion 仍计其分配量（ionKb 高）而 dmabuf_dump 为空。
 *
 * 口径差异（重要）：meminfo_ion = 分配者计费（谁 ion_alloc），dmabuf_dump = 持有者视图（谁持有 fd）。
 * 二者对同一进程可能差异很大，均诚实展示，不互相覆盖。
 *
 * 聚合：dmabuf_dump 中常出现多个同尺寸 buffer（如 10 个 1440x1080-NV21 各 2352 KB），按 Rss(KB)
 * 分组计数，统计数量与总占用。返回全部组，渲染层取 Top10（按总占用）并补齐 10 行占位。
 */
export function parseDmabufDump(stdout: string, pid: number): ParsedDmabufDump {
  // 不持有 dmabuf fd 的进程（分配者等）——dmabuf_dump 直接回 "dmabuf info not found"
  if (/dmabuf info not found/i.test(stdout)) {
    return { pid, totalKb: 0, groups: [] }
  }

  // buffer 行：<名称>  <Rss> kB  <Pss> kB  <nr_procs>  <inode>  <exporter>
  // 名称实测为单 token（无空格，可含冒号/逗号/数字），用非贪婪 + 从右锚定 nr_procs/inode/exporter
  // 稳妥：表头(无 kB)、PROCESS TOTAL(缺 nr_procs/inode/exporter)、段头、分隔线均不匹配，自动跳过。
  const re = /^\s*(.+?)\s+(\d+)\s+kB\s+(\d+)\s+kB\s+(\d+)\s+(\d+)\s+(\S+)\s*$/
  const bySize = new Map<number, DmabufGroup>()
  let totalKb = 0

  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(re)
    if (!m) continue
    const rss = Number(m[2])
    if (rss === 0) continue // regex \d+ 保证 rss 为非负有限数；0 KB buffer 无意义跳过
    totalKb += rss
    const g = bySize.get(rss)
    if (g) {
      g.count += 1
      g.totalKb += rss
    } else {
      bySize.set(rss, { sizeKb: rss, count: 1, totalKb: rss })
    }
  }

  const groups = Array.from(bySize.values()).sort((a, b) => b.totalKb - a.totalKb)
  return { pid, totalKb, groups }
}
