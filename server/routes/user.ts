import { Router } from 'express'
import { query } from '../db/index.js'
import { authMiddleware, adminMiddleware, ownerMiddleware } from '../middleware/auth.js'

const router = Router()

// 所有路由需要认证
router.use(authMiddleware)

// 获取当前用户详细信息
router.get('/profile', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, feishu_id, name, email, avatar, tenant_key, role, created_at, last_login_at
       FROM users WHERE id = $1`,
      [req.user!.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user: rows[0] })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile' })
  }
})

// 获取设备连接历史
router.get('/device-history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    const { rows } = await query(
      `SELECT id, device_serial, device_model, connected_at
       FROM device_history
       WHERE user_id = $1
       ORDER BY connected_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user!.id, limit, offset]
    )

    const { rows: countRows } = await query(
      'SELECT COUNT(*) as total FROM device_history WHERE user_id = $1',
      [req.user!.id]
    )

    res.json({
      devices: rows,
      total: parseInt(countRows[0].total as string),
      limit,
      offset
    })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch device history' })
  }
})

// 管理员：获取所有用户列表
router.get('/list', adminMiddleware, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, feishu_id, name, email, avatar, tenant_key, role, created_at, last_login_at
       FROM users ORDER BY created_at DESC`
    )
    res.json({ users: rows })
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// 修改用户角色 (仅 owner/admin)
router.put('/:id/role', adminMiddleware, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id as string)
    const { role: newRole } = req.body as { role: string }

    if (!['user', 'admin', 'owner'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be: user, admin, owner' })
    }

    // Owner 不可被降级（仅 owner 可操作 owner）
    const { rows: target } = await query('SELECT role FROM users WHERE id = $1', [targetId])
    if (target.length === 0) return res.status(404).json({ error: 'User not found' })

    if (target[0].role === 'owner' && req.user!.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can modify owner role' })
    }

    // 仅 owner 可以提升他人为 owner/admin
    if ((newRole === 'owner' || newRole === 'admin') && req.user!.role !== 'owner') {
      return res.status(403).json({ error: 'Only owner can grant owner/admin role' })
    }

    await query('UPDATE users SET role = $1 WHERE id = $2', [newRole, targetId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' })
  }
})

export default router
