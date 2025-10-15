import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => res.json({ message: 'Get notifications' }));
router.put('/:id/read', (req, res) => res.json({ message: 'Mark notification as read' }));
router.delete('/:id', (req, res) => res.json({ message: 'Delete notification' }));

export { router as notificationRoutes };
