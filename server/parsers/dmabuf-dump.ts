export interface DmabufGroup {
  sizeKb: number
  count: number
  totalKb: number
}

export interface ParsedDmabufDump {
  pid: number
  totalKb: number
  groups: DmabufGroup[]
}

export function parseDmabufDump(pid: number, output: string): ParsedDmabufDump {
  const sizeMap = new Map<number, { count: number; totalKb: number }>()
  let totalKb = 0

  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---')) continue
    // Format varies: look for size_kb fields like "size: 4096" or columns with size
    const sizeMatch = trimmed.match(/size[:\s]+(\d+)/i)
    if (sizeMatch) {
      const sizeBytes = parseInt(sizeMatch[1], 10)
      const sizeKb = Math.round(sizeBytes / 1024) || sizeBytes // some outputs already in kB
      totalKb += sizeKb
      const g = sizeMap.get(sizeKb) || { count: 0, totalKb: 0 }
      g.count++
      g.totalKb += sizeKb
      sizeMap.set(sizeKb, g)
      continue
    }
    // Columnar format: "  <fd>  <exp_name>  <size>  <ino>  ..."
    const cols = trimmed.split(/\s+/)
    if (cols.length >= 3) {
      const size = parseInt(cols[2], 10)
      if (!isNaN(size) && size > 0) {
        const sizeKb = Math.round(size / 1024) || size
        totalKb += sizeKb
        const g = sizeMap.get(sizeKb) || { count: 0, totalKb: 0 }
        g.count++
        g.totalKb += sizeKb
        sizeMap.set(sizeKb, g)
      }
    }
  }

  const groups: DmabufGroup[] = [...sizeMap.entries()]
    .map(([sizeKb, v]) => ({ sizeKb, count: v.count, totalKb: v.totalKb }))
    .sort((a, b) => b.totalKb - a.totalKb)

  return { pid, totalKb, groups }
}
