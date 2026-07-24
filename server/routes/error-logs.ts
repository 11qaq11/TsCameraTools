import { Router } from 'express'
import { query } from '../db/index.js'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'

const router = Router()

// Submit error log (from desktop Electron app)
router.post('/', async (req, res) => {
  try {
    const { error_type, message, stack_trace, device_info, app_version } = req.body as {
      error_type?: string
      message: string
      stack_trace?: string
      device_info?: Record<string, unknown>
      app_version?: string
    }

    if (!message) {
      return res.status(400).json({ error: 'message is required' })
    }

    // Auto-cleanup: delete records older than 30 days
    await query("DELETE FROM error_logs WHERE created_at < NOW() - INTERVAL '30 days'")

    const { rows } = await query(
      `INSERT INTO error_logs (error_type, message, stack_trace, device_info, app_version)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      [
        error_type || 'unknown',
        message.substring(0, 4096),
        (stack_trace || '').substring(0, 8192),
        JSON.stringify(device_info || {}),
        app_version || '',
      ]
    )

    res.status(201).json({ success: true, id: rows[0].id })
  } catch (e) {
    res.status(500).json({ error: 'Failed to save error log' })
  }
})

// List error logs (admin)
router.get('/list', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    const { rows } = await query(
      `SELECT id, error_type, message, stack_trace, device_info, app_version, created_at
       FROM error_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    const { rows: countRows } = await query('SELECT COUNT(*) as total FROM error_logs')
    res.json({ logs: rows, total: parseInt(countRows[0].total as string) })
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch error logs' })
  }
})

export default router
