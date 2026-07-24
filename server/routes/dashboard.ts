import { Router } from 'express'
import { query } from '../db/index.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()

router.get('/stats', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const totalUsers = await query('SELECT COUNT(*)::int as total_users FROM users')
    const todayUsers = await query("SELECT COUNT(*)::int as today_users FROM users WHERE last_login_at > NOW() - INTERVAL '24 hours'")
    const totalFeedbacks = await query('SELECT COUNT(*)::int as total_feedbacks FROM feedbacks')
    const totalErrors = await query('SELECT COUNT(*)::int as total_errors FROM error_logs')
    const recentUsers = await query('SELECT id, name, email, role, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT 5')
    const recentErrors = await query('SELECT id, error_type, message, created_at FROM error_logs ORDER BY created_at DESC LIMIT 5')

    res.json({
      total_users: totalUsers.rows[0].total_users,
      today_users: todayUsers.rows[0].today_users,
      total_feedbacks: totalFeedbacks.rows[0].total_feedbacks,
      total_errors: totalErrors.rows[0].total_errors,
      recent_users: recentUsers.rows,
      recent_errors: recentErrors.rows,
    })
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch dashboard stats' })
  }
})

export default router
