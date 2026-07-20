import type { ParsedDumpsys, DumpsysCategory } from '../../shared/types'

/**
 * 解析 `dumpsys meminfo <pid>` 输出。关键区段：
 *   ** MEMINFO in pid 2875 [com.android.systemui] **
 *                    Pss  Private  Private  SwapPss      Rss ...
 *                  Total    Dirty    Clean    Dirty    Total ...
 *   Native Heap    62880    41792    21060    26382    64060 ...
 *   ...
 *         TOTAL   347006   181169   115896    34924   432445 ...
 *   App Summary
 *                       Pss(KB)                        Rss(KB)
 *                        ------                         ------
 *            Java Heap:    47520                          80888
 */
export function parseDumpsysMeminfo(stdout: string): ParsedDumpsys {
  const pidMatch = stdout.match(/MEMINFO in pid\s+(\d+)/)
  const pid = pidMatch ? Number(pidMatch[1]) : 0
  const categories: DumpsysCategory[] = []
  let totalPss = 0
  let totalRss = 0
  let totalPrivateDirty = 0
  let totalPrivateClean = 0
  let totalSwapPss = 0

  // 定位表头行到 TOTAL 行之间的分类数据行
  const lines = stdout.split(/\r?\n/)
  let inTable = false
  for (const line of lines) {
    // 表头首行：列名随 Android 版本变化，第 4 列为 Swap / SwapPss / Swap(Pss)，
    // 用 Swap\S* 兼容，避免因列名不匹配导致 inTable 永假、整表不解析（totalPss 全 0）。
    if (/^\s*Pss\s+Private\s+Private\s+Swap\S*\s+Rss/.test(line)) {
      inTable = true
      continue
    }
    if (!inTable) continue
    if (/^\s*Total\s+/.test(line)) continue // 表头第二行
    if (/^\s*-{3,}/.test(line) || line.trim() === '') {
      if (categories.length > 0) break
      continue
    }
    // 分类行：以空格开头的多列数字。最后可能有空的 Heap 列。
    // 形如 "  Native Heap    62880    41792    21060    26382    64060   138596    92344    42052"
    const m = line.match(/^\s+([\w. ()/]+?)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/)
    if (m) {
      const [, name, pss, pdirty, pclean, swap, rss] = m
      if (name.trim().toUpperCase() === 'TOTAL') {
        totalPss = Number(pss)
        totalRss = Number(rss)
        totalPrivateDirty = Number(pdirty)
        totalPrivateClean = Number(pclean)
        totalSwapPss = Number(swap)
        continue
      }
      categories.push({
        name: name.trim(),
        pssTotal: Number(pss),
        privateDirty: Number(pdirty),
        privateClean: Number(pclean),
        swapPssDirty: Number(swap),
        rss: Number(rss)
      })
    }
  }

  // cmf 口径：PSS 减 EGL mtrack（图形 dma-buf 映射，由 gralloc 分配），避免与 meminfo_ion 的
  // 图形 ion 计费重复（cmf AdbClientExtension: TOTAL PSS − EGL mtrack）。
  // EGL mtrack 行已被解析进 categories，按名取 pssTotal；无该行（非图形进程）则 egl=0，pssNoEgl=totalPss。
  const eglMtrackPss = categories.find((c) => c.name === 'EGL mtrack')?.pssTotal ?? 0
  const pssNoEgl = totalPss - eglMtrackPss

  return { pid, totalPss, eglMtrackPss, pssNoEgl, totalRss, totalPrivateDirty, totalPrivateClean, totalSwapPss, categories }
}
