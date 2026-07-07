# Quickstart Validation Scenarios

**Feature**: specs/006-ui-redesign-terminal
**Created**: 2026-07-07

## 前置条件

1. `npm install` 依赖已安装
2. `bin/ttyd/ttyd.exe` 二进制文件存在
3. `.env` 文件已配置（见下方）
4. 至少一台 Android 设备通过 USB 连接

### .env.example 更新内容

Phase 2 完成后，`.env.example` 应包含以下完整变量：

```env
# 服务器配置
PORT=3000
HTTPS=true
FRONTEND_URL=https://localhost:5173

# 飞书 OAuth 配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_REDIRECT_URI=https://localhost:3000/auth/feishu/callback

# ADB 配置（Windows 需要完整路径）
ADB_PATH=C:\tools\platform-tools\adb.exe

# ttyd 终端配置
TTYD_PORT_START=7681
TTYD_PORT_END=7690
TTYD_CREDENTIAL=admin:admin
```

## 验证场景

### V1: Light 主题渲染

```bash
npm run web:dev
# 浏览器打开 http://localhost:5173
```

**验证点**:
- [ ] 背景色为浅色 (#F8FAFC)
- [ ] 文字为深色 (#0F172A)
- [ ] 卡片为白色 (#FFFFFF) 带浅灰边框
- [ ] 主色调为蓝色 (#2563EB)
- [ ] 文字对比度 >= 4.5:1（用浏览器 DevTools 检查）

### V2: 导航栏展开/折叠

```bash
# 在 V1 基础上操作
```

**验证点**:
- [ ] 左侧导航栏默认展开（240px），显示 Logo + 菜单文字
- [ ] 点击折叠按钮，导航栏收缩为 64px，仅显示图标
- [ ] 再次点击展开按钮，恢复 240px
- [ ] 折叠状态下，鼠标悬停图标显示 tooltip
- [ ] 展开/折叠动画时长 200-300ms，无卡顿

### V3: 导航菜单切换

**验证点**:
- [ ] 点击"设备连接"菜单项，右侧显示设备列表
- [ ] 当前选中菜单项高亮（蓝色背景）
- [ ] 未选中菜单项为默认样式

### V4: ttyd 终端启动

```bash
# 确保设备已连接
adb devices  # 应显示至少一台 device 状态的设备
```

**验证点**:
- [ ] 设备列表显示已连接设备
- [ ] 点击 "Connect" 按钮，终端区域加载
- [ ] 终端显示 ttyd 的 Web UI（xterm.js 渲染）
- [ ] 终端显示 adb shell 提示符

### V5: ttyd 终端交互

**验证点**:
- [ ] 输入 `ls` 命令，终端显示文件列表
- [ ] 输入 `echo "中文测试"`，终端正确显示中文
- [ ] 使用 Ctrl+C 中断当前命令
- [ ] 终端窗口 resize 时自动调整列数/行数
- [ ] 关闭终端会话后，ttyd 进程被正确清理

### V6: 构建验证

```bash
npm run web:build
```

**验证点**:
- [ ] TypeScript 编译通过（无类型错误）
- [ ] Vite 构建成功（无打包错误）
- [ ] `dist/` 目录生成前端产物
- [ ] `dist/server/` 目录生成后端产物

### V7: Lint 检查

```bash
npm run lint
```

**验证点**:
- [ ] 无 lint 错误
- [ ] 警告数量不增加

### V8: 单元测试

```bash
npm test
```

**验证点**:
- [ ] 所有测试通过
- [ ] 新增测试覆盖：navigation, Sidebar, TtydTerminal, ttyd service
- [ ] 覆盖率 >= 80%（`npm test -- --coverage`）

### V9: 安全验证

**验证点**:
- [ ] ttyd 使用 `TTYD_CREDENTIAL` 启动，无凭证时无法访问终端
- [ ] ttyd 仅监听 127.0.0.1，外网无法访问
- [ ] `.env` 文件未提交到 git

## 故障排除

### ttyd 启动失败

```bash
# 检查二进制是否存在
Test-Path bin/ttyd/ttyd.exe

# 手动测试 ttyd
bin/ttyd/ttyd.exe -p 7681 adb shell
# 浏览器打开 http://localhost:7681
```

### 端口被占用

```bash
netstat -ano | findstr 7681
# 如果被占用，kill 对应进程或修改起始端口
```
