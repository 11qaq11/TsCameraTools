import { useEffect, useState } from 'react'
import { Card, Table, Button, Typography, Space, Tag, Input, Modal, Form, App, Tooltip, Switch, Popconfirm } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined, ArrowRightOutlined, UndoOutlined } from '@ant-design/icons'
import { useStore } from '../store'
import type { ProcessStatus, ProcessCategory } from '@shared/types'

const { Title, Text } = Typography

/** 分类排序权重（仅 UI 排序，不参与抓取）：app/algo 在前，allocator 在后 */
const CATEGORY_ORDER: Record<ProcessCategory, number> = {
  app: 0, algo: 1, service: 2, provider: 3, allocator: 4, kernel: 5
}

/** 进程列表排序：运行中优先 → 分类 → 别名 */
function sortProcesses(list: ProcessStatus[]): ProcessStatus[] {
  return [...list].sort((a, b) => {
    if (a.running !== b.running) return a.running ? -1 : 1
    const ca = CATEGORY_ORDER[a.category ?? 'provider'] ?? 9
    const cb = CATEGORY_ORDER[b.category ?? 'provider'] ?? 9
    if (ca !== cb) return ca - cb
    return (a.alias ?? a.name).localeCompare(b.alias ?? b.name)
  })
}

export default function ProcessManager() {
  const { message } = App.useApp()
  const setStage = useStore((s) => s.setStage)
  const device = useStore((s) => s.device)
  const isRoot = useStore((s) => s.isRoot)
  const processes = useStore((s) => s.processes)
  const setProcesses = useStore((s) => s.setProcesses)
  const selectedNames = useStore((s) => s.selectedNames)
  const setSelected = useStore((s) => s.setSelected)

  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [onlyRunning, setOnlyRunning] = useState(false)
  const [form] = Form.useForm<{ name: string; alias?: string; note?: string; dynamic?: boolean }>()

  // 进入页面：读取进程列表 + 自动刷新 PID（pidOfFast，19 条不卡顿）
  const loadAndRefresh = async () => {
    setLoading(true)
    try {
      const list = await window.api.process.list()
      const statuses = await window.api.process.refreshPids(list)
      setProcesses(statuses)
      // 首次进入默认选中所有运行中的进程（自动匹配：运行中的相机进程全选进入抓取）
      if (selectedNames.length === 0) {
        const running = statuses.filter((p) => p.running).map((p) => p.name)
        if (running.length > 0) setSelected(running)
      }
    } catch (e) {
      message.error((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAndRefresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshPidsOf = async (list: { name: string }[]) => {
    const statuses = await window.api.process.refreshPids(list as any)
    setProcesses(statuses)
    return statuses
  }

  const onAdd = async () => {
    const v = await form.validateFields()
    const r = (await window.api.process.add(v.name, v.alias, v.note, v.dynamic ?? true)) as any
    if (r.ok) {
      message.success(`已新增进程 ${v.name}`)
      form.resetFields()
      setModalOpen(false)
      await refreshPidsOf(r.processes)
    } else {
      message.error(r.error)
    }
  }

  const onRemove = async (name: string) => {
    const r = (await window.api.process.remove(name)) as any
    if (r.ok) {
      message.success(`已删除 ${name}`)
      await refreshPidsOf(r.processes)
      if (selectedNames.includes(name)) setSelected(selectedNames.filter((n) => n !== name))
    }
  }

  const onReset = async () => {
    const r = (await window.api.process.reset()) as any
    if (r.ok) {
      const statuses = await refreshPidsOf(r.processes)
      // 恢复默认后重置选择为运行中
      setSelected(statuses.filter((p) => p.running).map((p) => p.name))
      message.success('已恢复默认进程列表（19 条）')
    }
  }

  const onSelectRunning = () => {
    const running = processes.filter((p) => p.running).map((p) => p.name)
    setSelected(running)
    message.info(`已选中 ${running.length} 个运行中进程`)
  }

  // 整行点击切换选中（点勾选框列 / 删除按钮时不重复处理）
  const onRowClick = (row: ProcessStatus, e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.ant-table-selection-column')) return
    if (target.closest('button')) return
    setSelected(
      selectedNames.includes(row.name)
        ? selectedNames.filter((n) => n !== row.name)
        : [...selectedNames, row.name]
    )
  }

  // 排序 + 「仅显示运行中」过滤
  const sorted = sortProcesses(processes)
  const visible = onlyRunning ? sorted.filter((p) => p.running) : sorted

  const selectedRunningCount = selectedNames.filter(
    (n) => processes.find((p) => p.name === n)?.running
  ).length

  return (
    <div style={{ flex: 1, minHeight: 0, padding: 24, overflow: 'auto', background: '#f5f7fa' }}>
      <Space style={{ marginBottom: 8 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => setStage('device')}>返回设备</Button>
        <Title level={4} style={{ margin: 0 }}>步骤 2 / 3 · 配置监控进程</Title>
      </Space>
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">
          当前设备：<Tag color="blue">{device?.model ?? device?.serial}</Tag>
          root：<Tag color={isRoot ? 'green' : 'red'}>{isRoot ? '是' : '否（dmabuf/showmap 等命令可能受限）'}</Tag>
          {'　'}已识别 <Tag color="green">{processes.filter((p) => p.running).length}</Tag> / {processes.length} 个进程运行中
        </Text>
      </div>

      <Card
        size="small"
        title="相机进程 catalog（参考 camera-memory-fetcher proclist；自动匹配设备运行进程，? 为动态 PID）"
        extra={
          <Space wrap>
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>仅显示运行中</Text>
              <Switch size="small" checked={onlyRunning} onChange={setOnlyRunning} />
            </Space>
            <Button size="small" onClick={onSelectRunning}>全选运行中</Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={loadAndRefresh} loading={loading}>刷新 PID</Button>
            <Popconfirm title="恢复默认 19 条 catalog？将丢弃自定义增删" onConfirm={onReset} okText="恢复" cancelText="取消">
              <Button size="small" icon={<UndoOutlined />}>恢复默认</Button>
            </Popconfirm>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>新增进程</Button>
          </Space>
        }
      >
        <Table<ProcessStatus>
          rowKey="name"
          size="small"
          loading={loading}
          dataSource={visible}
          pagination={false}
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedNames,
            onChange: (keys) => setSelected(keys as string[])
          }}
          onRow={(record) => ({ onClick: (e) => onRowClick(record, e) })}
          columns={[
            {
              title: '进程',
              dataIndex: 'name',
              render: (name: string, row) => (
                <Space size={4} direction="vertical" style={{ lineHeight: 1.2 }}>
                  <Space size={4}>
                    {row.alias && <Tag color="blue">{row.alias}</Tag>}
                    {row.dynamic && (
                      <Tooltip title="动态 PID：进程可能启停，抓取时每 tick 重新识别（参考 proclist 的 ? 后缀）">
                        <Tag color="orange" style={{ marginInlineEnd: 0 }}>?</Tag>
                      </Tooltip>
                    )}
                    <Text strong style={{ fontSize: 12 }}>{name}</Text>
                  </Space>
                  {row.note && <Text type="secondary" style={{ fontSize: 11 }}>{row.note}</Text>}
                </Space>
              )
            },
            {
              title: 'PID', dataIndex: 'pid', width: 80,
              render: (p: number | null) => (p == null ? '-' : String(p))
            },
            {
              title: '状态', dataIndex: 'running', width: 90,
              render: (r: boolean) => <Tag color={r ? 'green' : 'default'}>{r ? '运行中' : '未运行'}</Tag>
            },
            {
              title: '操作', width: 70, render: (_v, row) => (
                <Tooltip title="删除">
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => onRemove(row.name)} />
                </Tooltip>
              )
            }
          ]}
        />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary">
            已选 <Tag color="processing">{selectedNames.length}</Tag> 个进程（其中 <Tag color="green">{selectedRunningCount}</Tag> 个运行中，将进入抓取面板）
          </Text>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            disabled={selectedNames.length === 0}
            onClick={() => setStage('dashboard')}
          >进入抓取面板</Button>
        </div>
      </Card>

      <Modal open={modalOpen} title="新增监控进程" onCancel={() => setModalOpen(false)} onOk={onAdd} okText="新增">
        <Form form={form} layout="vertical" initialValues={{ dynamic: true }}>
          <Form.Item name="name" label="进程名" rules={[
            { required: true, message: '请输入进程名，如 com.android.systemui' },
            { pattern: /^[A-Za-z0-9._@-]+$/, message: '仅允许字母、数字、. _ @ -' }
          ]}>
            <Input placeholder="com.android.systemui" />
          </Form.Item>
          <Form.Item name="alias" label="缩略名（可选，列表展示用）">
            <Input placeholder="如：MY_PROC" />
          </Form.Item>
          <Form.Item name="note" label="备注（可选）">
            <Input placeholder="如：系统 UI" />
          </Form.Item>
          <Form.Item name="dynamic" label="PID 动态变化" valuePropName="checked" tooltip="勾选则抓取时每 tick 重新识别进程（APP/Gallery 等会启停的进程需勾选）；boot 服务可不勾">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
