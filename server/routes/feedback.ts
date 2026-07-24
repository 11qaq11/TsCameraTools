import { Router } from 'express'
import { query } from '../db/index.js'

const router = Router()

// Submit feedback (public, no auth required)
router.post('/', async (req, res) => {
  try {
    const { user_name, category, title, content, contact, device_model } = req.body as {
      user_name?: string
      category?: string
      title: string
      content: string
      contact?: string
      device_model?: string
    }

    if (!title || !content) {
      return res.status(400).json({ error: 'title and content are required' })
    }

    const { rows } = await query(
      `INSERT INTO feedbacks (user_name, category, title, content, contact, device_model)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
      [user_name || '', category || 'bug', title, content, contact || '', device_model || '']
    )

    res.status(201).json({ success: true, id: rows[0].id, created_at: rows[0].created_at })
  } catch (e) {
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

// List feedbacks (admin)
router.get('/list', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    const { rows } = await query(
      `SELECT id, user_name, category, title, content, contact, device_model, created_at
       FROM feedbacks ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    const { rows: countRows } = await query('SELECT COUNT(*) as total FROM feedbacks')
    res.json({ feedbacks: rows, total: parseInt(countRows[0].total as string) })
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch feedbacks' })
  }
})

export default router
