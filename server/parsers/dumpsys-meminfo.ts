export interface DumpsysCategory {
  name: string
  pssTotal: number
  privateDirty: number
  privateClean: number
  swapPssDirty: number
  rss: number
}

export interface ParsedDumpsys {
  pid: number
  totalPss: number
  eglMtrackPss: number
  pssNoEgl: number
  totalRss: number
  totalPrivateDirty: number
  totalPrivateClean: number
  totalSwapPss: number
  categories: DumpsysCategory[]
}

export function parseDumpsysMeminfo(output: string): ParsedDumpsys {
  const lines = output.split('\n')

  const pid = extractPid(lines)
  const totalPss = extractTotal(lines, 'TOTAL PSS:')
  const totalRss = extractTotal(lines, 'TOTAL RSS:')
  const totalPrivateDirty = extractTotal(lines, 'TOTAL PRIVATE DIRTY:')
  const totalPrivateClean = extractTotal(lines, 'TOTAL PRIVATE CLEAN:')
  const totalSwapPss = extractTotal(lines, 'TOTAL SWAP PSS:')

  let eglMtrackPss = 0
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('EGL mtrack')) {
      const cols = trimmed.split(/\s+/)
      eglMtrackPss = parseInt(cols[2] || '0', 10) || 0
      break
    }
  }

  const categories = extractCategories(lines)
  const pssNoEgl = totalPss - eglMtrackPss

  return {
    pid,
    totalPss,
    eglMtrackPss,
    pssNoEgl,
    totalRss,
    totalPrivateDirty,
    totalPrivateClean,
    totalSwapPss,
    categories,
  }
}

function extractPid(lines: string[]): number {
  for (const line of lines) {
    const m = line.match(/MEMINFO in pid\s+(\d+)/)
    if (m) return parseInt(m[1], 10)
  }
  return 0
}

function extractTotal(lines: string[], prefix: string): number {
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith(prefix)) {
      const m = trimmed.match(/(\d+)/)
      if (m) return parseInt(m[1], 10)
    }
  }
  // Fallback: parse TOTAL row from category table
  if (prefix === 'TOTAL PSS:') {
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('TOTAL ')) {
        const cols = trimmed.split(/\s+/)
        if (cols.length >= 2) return parseInt(cols[1], 10) || 0
      }
    }
  }
  return 0
}

function extractCategories(lines: string[]): DumpsysCategory[] {
  const categories: DumpsysCategory[] = []
  let inTable = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('App Summary')) break
    if (!inTable) {
      if (/^\s*Pss\(kB\)/.test(line) || /^\s*Pss\s+Private/.test(line)) {
        inTable = true
      }
      continue
    }
    if (!trimmed || trimmed.startsWith('---') || trimmed.startsWith('TOTAL')) continue
    // Category rows: name followed by numeric columns
    const m = trimmed.match(/^(\S(?:.*\S)?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/)
    if (m) {
      categories.push({
        name: m[1],
        pssTotal: parseInt(m[2], 10) || 0,
        privateDirty: parseInt(m[3], 10) || 0,
        privateClean: parseInt(m[4], 10) || 0,
        swapPssDirty: parseInt(m[5], 10) || 0,
        rss: parseInt(m[6], 10) || 0,
      })
    }
  }
  return categories
}
