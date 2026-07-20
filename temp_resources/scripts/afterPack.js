const fs = require('node:fs')
const path = require('node:path')

/**
 * afterPack 钩子：等待企业 EDR（ztsmedr.exe / QMMemScan64.exe 等）完成对新 exe 的扫描。
 *
 * 背景：企业安全 agent 会在 exe 创建/改名后短暂独占文件句柄做扫描。electron-builder
 * 在 pack 之后、signAndEditResources 之前若立即写 asar 完整性资源，会因 EBUSY 失败。
 *
 * 策略：不止做一次「可写」探测（EDR 扫描是分段的，单次可写可能只是片段间隙），而是
 * 要求连续 STABLE_CHECKS 次可写探测都成功，确认扫描真正结束后再放行后续写入步骤。
 */
const STABLE_CHECKS = 4
const CHECK_INTERVAL_MS = 800
const MAX_WAIT_MS = 90_000

function tryOpenRW(p) {
  try {
    const fd = fs.openSync(p, 'r+')
    fs.closeSync(fd)
    return true
  } catch {
    return false
  }
}

exports.default = async function (context) {
  const product = context.packager.appInfo.productFilename
  const candidates = [`${product}.exe`, 'electron.exe']
  let exePath = null
  for (const name of candidates) {
    const p = path.join(context.appOutDir, name)
    if (fs.existsSync(p)) {
      exePath = p
      break
    }
  }
  if (!exePath) {
    console.warn('[afterPack] 未找到主 exe，跳过等待')
    return
  }

  const start = Date.now()
  let stable = 0
  let lastWaitLog = 0
  while (Date.now() - start < MAX_WAIT_MS) {
    if (tryOpenRW(exePath)) {
      stable++
      if (stable >= STABLE_CHECKS) {
        const waited = Math.round((Date.now() - start) / 1000)
        console.log(`[afterPack] ${path.basename(exePath)} 连续 ${STABLE_CHECKS} 次可写（等待约 ${waited}s），EDR 扫描应已结束`)
        return
      }
    } else {
      stable = 0
    }
    await new Promise((r) => setTimeout(r, CHECK_INTERVAL_MS))
    const elapsed = Date.now() - start
    if (elapsed - lastWaitLog > 5000) {
      console.warn(`[afterPack] 等待 ${path.basename(exePath)} 解锁（已 ${Math.round(elapsed / 1000)}s）...`)
      lastWaitLog = elapsed
    }
  }
  console.warn(`[afterPack] 警告：${path.basename(exePath)} 等待 ${MAX_WAIT_MS / 1000}s 仍不稳定，继续构建（后续步骤可能失败）`)
}
