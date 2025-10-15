import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => res.json({ message: 'Get attempts' }));
router.post('/:examId/start', (req, res) => res.json({ message: 'Start exam attempt' }));
router.get('/:id', (req, res) => res.json({ message: 'Get attempt by ID' }));
router.put('/:id/answer', (req, res) => res.json({ message: 'Save answer' }));
router.post('/:id/submit', (req, res) => res.json({ message: 'Submit exam' }));

export { router as attemptRoutes };
