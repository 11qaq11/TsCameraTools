# 安全完成度 Checklist

**Feature**: specs/006-ui-redesign-terminal
**Created**: 2026-07-07
**用途**: 实现完成后逐项验证安全配置

## ttyd 安全

- [ ] ttyd 启动时配置 `-c {credential}` 参数（非无认证模式）
- [ ] 凭证从 `.env` 的 `TTYD_CREDENTIAL` 读取，不硬编码
- [ ] ttyd 仅监听 127.0.0.1（默认），不暴露到外网
- [ ] ttyd 端口范围限制在 `TTYD_PORT_START` ~ `TTYD_PORT_END`
- [ ] iframe src 指向 localhost，无跨域访问

## 环境变量

- [ ] `.env` 文件未提交到 git（已在 .gitignore 中）
- [ ] `.env.example` 包含所有新增变量及说明注释
- [ ] `TTYD_CREDENTIAL` 默认值为 `admin:admin`（仅开发环境）
- [ ] 生产环境部署文档说明如何修改凭证

## 认证流程

- [ ] 飞书 OAuth 登录流程正常（未被 ttyd 集成影响）
- [ ] 未登录用户无法访问设备管理页（ProtectedRoute 生效）
- [ ] Token 存储在 localStorage，未暴露到 ttyd iframe

## 输入安全

- [ ] 设备序列号（serial）传递给 ttyd 前有格式校验
- [ ] ttyd 启动参数无用户可控的注入点
- [ ] API 请求参数有基本校验（serial 非空、sessionId 格式）

## 进程管理

- [ ] ttyd 进程在用户断开连接时被正确 kill
- [ ] ttyd 进程在服务端重启时被清理（无孤儿进程）
- [ ] 端口释放后可被新会话复用
- [ ] 并发会话数不超过 `TTYD_PORT_END - TTYD_PORT_START + 1`

## 日志

- [ ] ttyd 启动/停止/失败事件记录到日志
- [ ] 日志不包含凭证信息（TTYD_CREDENTIAL 不记录）
- [ ] 日志不包含用户 Token
