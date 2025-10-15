import { Router } from 'express';
import { authenticate, adminOnly } from '@/middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', adminOnly, (req, res) => res.json({ message: 'Get all results - Admin' }));
router.get('/:id', (req, res) => res.json({ message: 'Get result by ID' }));
router.put('/:id/grade', adminOnly, (req, res) => res.json({ message: 'Grade result - Admin' }));
router.post('/:id/publish', adminOnly, (req, res) => res.json({ message: 'Publish result - Admin' }));

export { router as resultRoutes };
