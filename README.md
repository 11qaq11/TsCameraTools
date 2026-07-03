# TsCameraTools

影像开发工具箱 IDE，基于 Electron + React + TypeScript + Tailwind CSS。

## 快速开始

```bash
npm install
npm run electron:dev   # 开发模式
npm run electron:build # 打包 Windows exe
```

打包产物：`release/win-unpacked/TsCameraTools.exe`

## 开发分支提交流程

master 分支已开启保护，所有代码变更必须通过 Pull Request 合并，且需要至少 1 人 review 通过。

### 流程

```bash
# 1. 拉取最新 master
git checkout master
git pull origin master

# 2. 创建开发分支（按功能命名）
git checkout -b feature/你的功能名

# 3. 开发并提交（可多次提交）
git add -A
git commit -m "feat: 功能描述"

# 4. 推送开发分支到远程
git push origin feature/你的功能名

# 5. 创建 Pull Request
gh pr create --base master --title "feat: 功能描述" --body "详细说明"

# 6. 等待 review 通过后合并
gh pr merge --squash

# 7. 清理本地分支
git checkout master
git pull origin master
git branch -d feature/你的功能名
```

### 分支命名规范

| 前缀 | 用途 |
|------|------|
| `feature/` | 新功能 |
| `fix/` | 修复 bug |
| `refactor/` | 重构 |
| `docs/` | 文档变更 |

### 注意事项

- 禁止直接向 master 推送代码
- 禁止对 master 强制推送（force push）
- PR 合并前确保 `npm run electron:build` 能正常通过
- Commit message 遵循 `type: description` 格式

## 项目结构

```
├── electron/          # Electron 主进程 + preload
├── src/
│   ├── components/    # 通用组件
│   ├── layouts/       # 布局组件
│   ├── pages/         # 页面
│   └── types/         # 类型定义
├── .opencode/skills/  # AI agent 开发规范
└── AGENTS.md          # 项目准则（Ponytail + Karpathy）
```

## 技术栈

- Electron 43
- React 19 + TypeScript
- Vite 8 + Tailwind CSS 4
- xterm.js（终端模拟）
- lucide-react（图标）
