import { Router } from 'express';
import { getStats } from '../services/stats.js';

const router = Router();

// GET /api/stats
router.get('/', (_req, res) => {
  try {
    const stats = getStats();
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
