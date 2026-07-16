export interface ShowmapMapping {
  name: string
  vss: number
  rss: number
  pss: number
  dirty: number
}

export interface ParsedShowmap {
  pid: number
  mappings: ShowmapMapping[]
}

export function parseShowmap(pid: number, output: string): ParsedShowmap {
  const mappings: ShowmapMapping[] = []

  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // Skip header/separator lines
    if (trimmed.startsWith('---') || trimmed.startsWith('virtual') || /^NAME\s+/.test(trimmed)) continue
    // Format: virtual                    shared   shared  private  private
    //         size     RSS      PSS    clean    dirty    clean    dirty     swap  swapPSS   flags  object
    // Or simplified:  <vss> <rss> <pss> <dirty> ... <name>
    const cols = trimmed.split(/\s+/)
    if (cols.length < 6) continue
    const vss = parseInt(cols[0], 10)
    const rss = parseInt(cols[1], 10)
    const pss = parseInt(cols[2], 10)
    // dirty is typically column index 5 or 6 depending on format
    const dirty = parseInt(cols[5], 10) || 0
    // name is the last column (may contain spaces)
    const nameMatch = trimmed.match(/\S+\s+(.+)$/)
    const name = nameMatch ? nameMatch[1].trim() : cols[cols.length - 1]

    if (!isNaN(vss) && !isNaN(rss) && !isNaN(pss)) {
      mappings.push({ name, vss, rss, pss, dirty })
    }
  }

  // Sort by pss descending, take top 30
  mappings.sort((a, b) => b.pss - a.pss)
  const top30 = mappings.slice(0, 30)

  return { pid, mappings: top30 }
}
