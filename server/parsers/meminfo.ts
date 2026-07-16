export interface ParsedMeminfo {
  fields: Record<string, number>
}

export function parseMeminfo(output: string): ParsedMeminfo {
  const fields: Record<string, number> = {}
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // Format: MemTotal:       16384000 kB
    const m = trimmed.match(/^([\w()]+):\s+(\d+)/)
    if (m) {
      fields[m[1]] = parseInt(m[2], 10)
    }
  }
  return { fields }
}
