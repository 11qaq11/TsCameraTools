import { Router } from 'express'
import { query } from '../db/index.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// 所有路由需要认证
router.use(authMiddleware)

// 获取当前用户详细信息
router.get('/profile', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, feishu_id, name, email, avatar, tenant_key, created_at, last_login_at
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

export default router
