import { Router } from 'express';
import { authenticate, adminOnly } from '@/middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.use(adminOnly);

router.get('/dashboard', (req, res) => res.json({ message: 'Get dashboard analytics' }));
router.get('/exam/:id', (req, res) => res.json({ message: 'Get exam analytics' }));
router.get('/student/:id', (req, res) => res.json({ message: 'Get student analytics' }));

export { router as analyticsRoutes };
