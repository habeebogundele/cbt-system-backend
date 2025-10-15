import { Router } from 'express';
import { authenticate, adminOnly } from '@/middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.use(adminOnly);

router.get('/', (req, res) => res.json({ message: 'Get questions' }));
router.post('/', (req, res) => res.json({ message: 'Create question' }));
router.get('/:id', (req, res) => res.json({ message: 'Get question by ID' }));
router.put('/:id', (req, res) => res.json({ message: 'Update question' }));
router.delete('/:id', (req, res) => res.json({ message: 'Delete question' }));

export { router as questionRoutes };
