interface Props {
  /** 最近若干个采样值（内部截取最近 10 个，单位 KB 原值） */
  values: number[]
  color: string
  clickable?: boolean
  onClick?: () => void
  /** 可点击时的悬浮提示（默认 meminfo；dmabuf 面板传 dmabuf 提示） */
  clickHint?: string
}

/**
 * 数值滚动列表：最近 10 个采样从上到下排列，最新在底，旧的从顶部滚出。
 * 最新一行高亮加粗（用 color），其余行灰色。clickable 时整块可点击。
 * 替代旧柱状图，直接以文字数值展示内存数据（KB 整数，不保留小数）。
 */
export default function MiniList({ values, color, clickable, onClick, clickHint }: Props) {
  const recent = values.slice(-10)
  const fmt = (v: number) => `${Math.round(v)} KB`
  const lastIdx = recent.length - 1

  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        cursor: clickable ? 'pointer' : 'default',
        padding: '2px 4px',
        borderRadius: 4,
        background: clickable ? 'rgba(22,119,255,0.05)' : 'transparent',
        // 始终预留 10 行的高度（行高 18px），避免采样从 1 条增长到 10 条时
        // 卡片被撑高、把下方折线图逐步往下挤。
        minHeight: 180
      }}
      title={clickable ? (clickHint ?? '点击查看 meminfo 详细拆解') : undefined}
    >
      {recent.length === 0 && <div style={{ color: '#bbb', fontSize: 11, padding: '4px 0' }}>暂无数据</div>}
      {recent.map((v, i) => {
        const isLatest = i === lastIdx
        return (
          <div
            key={i}
            style={{
              fontSize: isLatest ? 13 : 11,
              fontWeight: isLatest ? 600 : 400,
              color: isLatest ? color : '#999',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: '18px',
              whiteSpace: 'nowrap'
            }}
          >
            {fmt(v)}
          </div>
        )
      })}
    </div>
  )
}
