import { Router } from 'express';
import { authenticate, adminOnly } from '@/middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.use(adminOnly);

router.post('/generate', (req, res) => res.json({ message: 'Generate report' }));
router.get('/:id/download', (req, res) => res.json({ message: 'Download report' }));
router.get('/', (req, res) => res.json({ message: 'List reports' }));

export { router as reportRoutes };
