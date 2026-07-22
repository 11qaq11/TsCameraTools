# TsCameraTools 部署指南

## 快速开始（Docker）

### 前置条件
- Docker 和 Docker Compose 已安装
- 飞书开放平台应用已创建（获取 App ID 和 App Secret）

### 1. 配置环境变量

复制并编辑 `.env` 文件：

```bash
cp .env.example .env
```

必须配置的变量：

```env
# 飞书 OAuth
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_REDIRECT_URI=http://your-domain.com:3000/auth/feishu/callback

# 数据库密码
DB_PASSWORD=your_secure_password

# 前端 URL（用于 CORS）
FRONTEND_URL=http://your-domain.com
```

### 2. 准备 Linux 二进制文件

下载 Linux 版本的 ttyd 和 adb 到 `bin/` 目录：

```bash
# ttyd Linux 版本
# 从 https://github.com/tsl0922/ttyd/releases 下载
mkdir -p bin/ttyd
# 将下载的文件重命名为 ttyd-linux 放入 bin/ttyd/

# Android platform-tools Linux 版本
# 从 https://developer.android.com/studio/releases/platform-tools 下载
mkdir -p bin/platform-tools-linux
# 将解压后的文件放入 bin/platform-tools-linux/
```

### 3. 构建并启动

```bash
# 构建 Docker 镜像
docker-compose build

# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app
```

### 4. 访问应用

- 前端：http://localhost
- API：http://localhost/api/
- 健康检查：http://localhost/health

---

## 环境变量说明

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `FEISHU_APP_ID` | 是 | - | 飞书应用 App ID |
| `FEISHU_APP_SECRET` | 是 | - | 飞书应用 App Secret |
| `FEISHU_REDIRECT_URI` | 否 | `http://localhost:3000/auth/feishu/callback` | OAuth 回调地址 |
| `DB_PASSWORD` | 否 | `postgres` | PostgreSQL 密码 |
| `DATABASE_URL` | 否 | `postgres://postgres:postgres@localhost:5432/tscameratools` | 数据库连接字符串 |
| `SESSION_EXPIRY_HOURS` | 否 | `24` | 会话过期时间（小时） |
| `FRONTEND_URL` | 否 | `http://localhost` | 前端 URL（CORS） |
| `PORT` | 否 | `3000` | 应用端口 |
| `TTYD_PORT_START` | 否 | `7681` | ttyd 端口范围起始 |
| `TTYD_PORT_END` | 否 | `7690` | ttyd 端口范围结束 |
| `TTYD_CREDENTIAL` | 否 | `admin:admin` | ttyd 认证凭据 |

---

## 数据库管理

### 查看数据库

```bash
# 进入 PostgreSQL 容器
docker-compose exec postgres psql -U postgres -d tscameratools

# 查看用户
SELECT * FROM users;

# 查看会话
SELECT * FROM sessions;

# 查看设备历史
SELECT * FROM device_history;
```

### 数据备份

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U postgres tscameratools > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U postgres tscameratools < backup.sql
```

---

## 生产环境建议

### 1. HTTPS 配置

在 Nginx 前添加 SSL 终止（使用 Let's Encrypt 或自签名证书）。

### 2. 日志管理

日志文件在 `./logs` 目录，建议配置 logrotate。

### 3. 监控

- 健康检查端点：`GET /health`
- 建议添加 Prometheus + Grafana 监控

### 4. 备份策略

- 数据库：每日自动备份
- 日志：定期归档

---

## 故障排查

### 数据库连接失败

```bash
# 检查 PostgreSQL 状态
docker-compose ps postgres

# 查看 PostgreSQL 日志
docker-compose logs postgres
```

### 应用启动失败

```bash
# 查看应用日志
docker-compose logs app

# 进入容器调试
docker-compose exec app sh
```

### 飞书 OAuth 失败

1. 检查 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET` 是否正确
2. 确认飞书开放平台的回调地址配置与 `FEISHU_REDIRECT_URI` 一致
3. 查看应用日志中的详细错误信息
