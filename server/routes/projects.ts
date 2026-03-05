import { Router } from 'express';
import { getDb } from '../db/connection.js';

const router = Router();

// GET /api/projects - List all projects with session counts
router.get('/', (_req, res) => {
  const db = getDb();
  const projects = db.prepare(`
    SELECT
      project_slug,
      project_path,
      COUNT(*) as session_count,
      MAX(modified_at) as last_activity,
      SUM(message_count) as total_messages
    FROM sessions
    GROUP BY project_slug
    ORDER BY last_activity DESC
  `).all();
  res.json(projects);
});

export default router;
