/**
 * 解析 `/proc/meminfo_ion`，返回 pid → ion 分配量（KB）。
 * 分配者计费口径（对齐 camera-memory-fetcher）：只统计 ion_alloc 的进程（allocator/hal 等），
 * 仅映射/持有但未分配的进程（如 APP/CAMERA3D）不在表中 → 0，天然不与 PSS 跨进程重复。
 *
 * 设备实测格式（单行）：
 *   419717120 0 1 3211264 0 9 4096 0 1521 3407872 0 1139 369434624 0 ...
 *   <total_bytes> 0 <pid1> <size1_bytes> 0 <pid2> <size2_bytes> 0 ...
 *
 * cmf parseMeminfoIon：丢弃前 2 个 token（total + 0），之后每 3 元组 (pid, size_bytes, 0)。
 * 单位为字节，/1024 转 KB。一轮 tick 仅 cat 一次（全局），按 pid 分发到各监控进程，
 * 替代旧 N 次 dmabuf_dump {pid}（映射/fd 口径，跨进程共享重复）。
 */
export function parseMeminfoIon(stdout: string): Map<number, number> {
  const tokens = stdout.trim().split(/\s+/)
  const map = new Map<number, number>()
  // i=2 起（drop 前 2 token：total + 0），步长 3：tokens[i]=pid, tokens[i+1]=size_bytes, tokens[i+2]=0
  for (let i = 2; i + 1 < tokens.length; i += 3) {
    const pid = Number(tokens[i])
    const size = Number(tokens[i + 1])
    if (Number.isInteger(pid) && pid > 0 && Number.isFinite(size)) {
      map.set(pid, Math.round(size / 1024))
    }
  }
  return map
}
