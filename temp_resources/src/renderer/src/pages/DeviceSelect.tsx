import { useEffect, useState } from 'react'
import { Card, Table, Button, Typography, Space, Alert, Spin, Tag, App } from 'antd'
import { ReloadOutlined, ArrowRightOutlined, UsbOutlined } from '@ant-design/icons'
import { useStore } from '../store'
import type { DeviceInfo } from '@shared/types'

const { Text } = Typography

export default function DeviceSelect() {
  const { message } = App.useApp()
  const setStage = useStore((s) => s.setStage)
  const setDevice = useStore((s) => s.setDevice)
  const setRoot = useStore((s) => s.setRoot)
  const device = useStore((s) => s.device)

  const [env, setEnv] = useState<{ adb?: { ok: boolean; reason?: string; version?: string }; usb?: { ok: boolean; reason?: string } } | null>(null)
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(device?.serial ?? null)

  // 启动即做环境检查（主进程已做硬门禁，这里用于回显状态）
  const checkEnv = async () => {
    setLoading(true)
    const r = (await window.api.env.check()) as any
    setEnv(r)
    if (r?.adb?.ok) {
      const dr = await window.api.adb.devices()
      if (dr.ok && dr.devices) setDevices(dr.devices)
    }
    setLoading(false)
  }

  useEffect(() => {
    void checkEnv()
  }, [])

  const enter = async (d: DeviceInfo) => {
    if (d.state !== 'device') {
      message.warning('该设备未就绪（unauthorized/offline），请在手机上授权 USB 调试后重试。')
      return
    }
    await window.api.adb.setSerial(d.serial)
    const { root } = await window.api.adb.isRoot()
    setRoot(root)
    setDevice(d)
    setStage('process')
  }

  const envOk = env?.adb?.ok && env?.usb?.ok

  return (
    <div style={{ flex: 1, minHeight: 0, padding: 24, overflow: 'auto', background: '#f5f7fa' }}>
      <Text type="secondary">步骤 1 / 3 · 检查环境并选择设备</Text>

      <Card style={{ marginTop: 16 }} size="small">
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Text strong><UsbOutlined /> 环境检查</Text>
          {!env && <Spin />}
          {env?.adb && (
            env.adb.ok
              ? <Tag color="success">ADB：{env.adb.version}</Tag>
              : <Tag color="error">ADB 不可用：{env.adb.reason}</Tag>
          )}
          {env?.usb && (
            env.usb.ok
              ? <Tag color="success">USB 驱动：{env.usb.reason}</Tag>
              : <Tag color="error">USB 驱动：{env.usb.reason}</Tag>
          )}
          {!envOk && env && (
            <Alert type="error" showIcon banner
              message="环境不满足，程序将终止。请安装 adb 与 ADB USB 驱动后重新启动。" />
          )}
        </Space>
      </Card>

      <Card
        style={{ marginTop: 16 }}
        size="small"
        title="已连接设备"
        extra={<Button icon={<ReloadOutlined />} onClick={checkEnv} loading={loading}>刷新</Button>}
      >
        <Table<DeviceInfo>
          rowKey="serial"
          size="small"
          dataSource={devices}
          pagination={false}
          rowSelection={{
            type: 'radio',
            selectedRowKeys: selected ? [selected] : [],
            onChange: (keys) => setSelected(keys[0] as string)
          }}
          onRow={(record) => ({
            onClick: (e) => {
              // 点击行中部（非单选列）也可选中设备
              const target = e.target as HTMLElement
              if (target.closest('.ant-table-selection-column')) return
              if (target.closest('button')) return
              setSelected(record.serial)
            }
          })}
          columns={[
            { title: '序列号', dataIndex: 'serial' },
            { title: '状态', dataIndex: 'state', render: (s: string) => <Tag color={s === 'device' ? 'green' : 'orange'}>{s}</Tag> },
            { title: '型号', dataIndex: 'model' },
            { title: '产品', dataIndex: 'product' }
          ]}
        />
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button
            type="primary"
            icon={<ArrowRightOutlined />}
            disabled={!selected}
            onClick={() => {
              const d = devices.find((x) => x.serial === selected)
              if (d) void enter(d)
            }}
          >进入工具</Button>
        </div>
      </Card>
    </div>
  )
}
