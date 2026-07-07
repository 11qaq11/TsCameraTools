# 需求完成度 Checklist

**Feature**: specs/006-ui-redesign-terminal
**Created**: 2026-07-07
**用途**: 实现完成后逐项勾选，确认所有需求已交付

## FR: 功能需求

- [ ] **FR-001**: 导航栏展开状态宽度 240px，折叠状态宽度 64px
- [ ] **FR-002**: 导航菜单通过 TypeScript 数组配置，新增工具仅需添加配置项
- [ ] **FR-003**: 导航栏底部显示版本号（v0.1.0）
- [ ] **FR-004**: 整体 Light 主题，背景 #F8FAFC，主色 #2563EB
- [ ] **FR-005**: Connect 按钮启动 ttyd 终端，替换旧 xterm.js 方案
- [ ] **FR-006**: 终端支持中文输入（IME）、文件传输（ZMODEM）、图像输出（Sixel）
- [ ] **FR-007**: 设备卡片保留 Root / Remount / Connect 三个操作按钮
- [ ] **FR-008**: 新增工具菜单项改动 < 5 行代码（在 `src/config/navigation.ts` 中验证）

## NFR: 非功能需求

- [ ] **NFR-001**: 首屏加载 < 2 秒（Chrome DevTools Network 面板测量）
- [ ] **NFR-002**: 终端输入延迟 < 50ms（ttyd 原生性能，无需额外优化）
- [ ] **NFR-003**: 文字对比度 >= 4.5:1（Chrome DevTools Accessibility 面板检查）
- [ ] **NFR-004**: 导航栏折叠/展开动画 200-300ms
- [ ] **NFR-005**: 1024px / 1280px / 1440px 三个断点布局正常

## Success Criteria: 成功标准

- [ ] Light 主题在 1440px 下视觉一致性 >= 90%（人工审查）
- [ ] ttyd 终端可执行 `adb shell` 并正确显示中文
- [ ] 添加新工具菜单项 < 5 行代码改动（实际验证）
- [ ] 飞书登录流程正常（`/#/login` → OAuth → 回调 → 跳转主页）
- [ ] 设备检测 / Root / Remount 功能正常

## Edge Cases: 边界场景

- [ ] 导航栏折叠状态下，鼠标悬停图标显示 tooltip
- [ ] ttyd 进程异常退出，前端显示断开提示（非白屏）
- [ ] 窗口 resize 时终端自适应尺寸

## Out of Scope: 确认未越界

- [ ] 未实现暗色主题切换
- [ ] 未实现终端多标签页
- [ ] 未实现终端录屏/回放
- [ ] 未做移动端适配
