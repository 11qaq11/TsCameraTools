export function parseMeminfoIon(output: string): Map<number, number> {
  const result = new Map<number, number>()
  for (const line of output.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    // Format: <pid> <ion_kb>  or  <pid>:<ion_kb>
    const m = trimmed.match(/^(\d+)\s*[:\s]\s*(\d+)/)
    if (m) {
      result.set(parseInt(m[1], 10), parseInt(m[2], 10))
    }
  }
  return result
}
