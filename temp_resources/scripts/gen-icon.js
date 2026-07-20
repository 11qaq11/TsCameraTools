const { Jimp } = require('jimp')
const fs = require('fs')
const path = require('path')

const SIZE = 1024
const OUT = path.join(__dirname, '..', 'build', 'icon.png')

// 每像素 4 字节 (R G B A)
const data = Buffer.alloc(SIZE * SIZE * 4)

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return
  const i = (y * SIZE + x) * 4
  data[i] = r
  data[i + 1] = g
  data[i + 2] = b
  data[i + 3] = a
}

function fillRect(x, y, w, h, r, g, b, a) {
  const x0 = Math.max(0, x)
  const y0 = Math.max(0, y)
  const x1 = Math.min(SIZE, x + w)
  const y1 = Math.min(SIZE, y + h)
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      setPixel(px, py, r, g, b, a)
    }
  }
}

function fillCircle(cx, cy, rad, r, g, b, a) {
  const x0 = Math.max(0, cx - rad)
  const y0 = Math.max(0, cy - rad)
  const x1 = Math.min(SIZE, cx + rad + 1)
  const y1 = Math.min(SIZE, cy + rad + 1)
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const dx = px - cx
      const dy = py - cy
      if (dx * dx + dy * dy <= rad * rad) {
        setPixel(px, py, r, g, b, a)
      }
    }
  }
}

function fillRoundedRect(x, y, w, h, rad, r, g, b, a) {
  const x0 = Math.max(0, x)
  const y0 = Math.max(0, y)
  const x1 = Math.min(SIZE, x + w)
  const y1 = Math.min(SIZE, y + h)
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const lx = px - x
      const ly = py - y
      // 判断是否在圆角矩形内
      let cx, cy
      if (lx < rad && ly < rad) { cx = rad; cy = rad }
      else if (lx >= w - rad && ly < rad) { cx = w - rad - 1; cy = rad }
      else if (lx < rad && ly >= h - rad) { cx = rad; cy = h - rad - 1 }
      else if (lx >= w - rad && ly >= h - rad) { cx = w - rad - 1; cy = h - rad - 1 }
      else { setPixel(px, py, r, g, b, a); continue }

      const dx = lx - cx
      const dy = ly - cy
      if (dx * dx + dy * dy <= rad * rad) {
        setPixel(px, py, r, g, b, a)
      }
    }
  }
}

// 颜色定义
const C = {
  bg: [15, 23, 42, 255],       // #0f172a
  panel: [22, 119, 255, 255],   // #1677ff
  chip: [248, 250, 252, 255],   // #f8fafc
  pin: [226, 232, 240, 255],    // #e2e8f0
  wave: [34, 197, 94, 255],     // #22c55e
  core: [22, 119, 255, 255],    // #1677ff
  dot: [34, 197, 94, 255],      // #22c55e
  shadow: [0, 0, 0, 80],        // 半透明阴影
}

// 1. 背景（透明，不填充实色，保留圆角面板自然边缘）
// Buffer.alloc 已初始化为全透明 (R=0,G=0,B=0,A=0)
// 如需保留极淡背景可取消下行注释：
// fillRect(0, 0, SIZE, SIZE, 15, 23, 42, 0)

// 2. 中心面板（带一点阴影偏移）
const panelSize = 600
const panelR = 140
const panelX = (SIZE - panelSize) / 2
const panelY = (SIZE - panelSize) / 2
fillRoundedRect(panelX + 8, panelY + 8, panelSize, panelSize, panelR, ...C.shadow)
fillRoundedRect(panelX, panelY, panelSize, panelSize, panelR, ...C.panel)

// 3. 芯片主体
const chipSize = 300
const chipR = 48
const chipX = (SIZE - chipSize) / 2
const chipY = (SIZE - chipSize) / 2
fillRoundedRect(chipX, chipY, chipSize, chipSize, chipR, ...C.chip)

// 4. 引脚
const pinW = 52
const pinH = 40
const pinGap = 36
// 上引脚（3个横条）
for (let i = 0; i < 3; i++) {
  const px = chipX + pinGap + i * (pinW + pinGap)
  const py = chipY - pinH
  fillRect(px, py, pinW, pinH, ...C.pin)
}
// 下引脚
for (let i = 0; i < 3; i++) {
  const px = chipX + pinGap + i * (pinW + pinGap)
  const py = chipY + chipSize
  fillRect(px, py, pinW, pinH, ...C.pin)
}
// 左引脚（3个竖条）
const vPinW = 40
const vPinH = 52
for (let i = 0; i < 3; i++) {
  const px = chipX - vPinW
  const py = chipY + pinGap + i * (vPinH + pinGap)
  fillRect(px, py, vPinW, vPinH, ...C.pin)
}
// 右引脚
for (let i = 0; i < 3; i++) {
  const px = chipX + chipSize
  const py = chipY + pinGap + i * (vPinH + pinGap)
  fillRect(px, py, vPinW, vPinH, ...C.pin)
}

// 5. 波形（绿色，芯片内部正弦波）
const waveStartX = chipX + 40
const waveEndX = chipX + chipSize - 40
const waveCenterY = chipY + chipSize / 2
const waveAmp = 28
const waveThick = 8
for (let x = waveStartX; x <= waveEndX; x++) {
  const t = ((x - waveStartX) / (waveEndX - waveStartX)) * Math.PI * 3
  const y = waveCenterY + Math.sin(t) * waveAmp
  for (let dy = -Math.floor(waveThick / 2); dy <= Math.floor(waveThick / 2); dy++) {
    const py = Math.round(y + dy)
    if (py >= chipY + 20 && py < chipY + chipSize - 20) {
      setPixel(x, py, ...C.wave)
    }
  }
}

// 6. 芯片核心（蓝色圆点）
fillCircle(SIZE / 2, SIZE / 2, 30, ...C.core)

// 7. 高光点缀（绿色小圆点，增加活力）
fillCircle(chipX + chipSize - 60, chipY + 60, 12, ...C.dot)

// 保存
fs.mkdirSync(path.dirname(OUT), { recursive: true })
const img = new Jimp({ width: SIZE, height: SIZE })
img.bitmap.data = data
img.write(OUT).then(() => {
  console.log('✅ Icon saved to', OUT)
}).catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
