import { Router } from 'express';
import { authenticate, adminOnly, studentOnly } from '@/middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin routes
router.get('/', adminOnly, (req, res) => {
  res.json({ message: 'Get all exams - Admin only' });
});

router.post('/', adminOnly, (req, res) => {
  res.json({ message: 'Create exam - Admin only' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get exam by ID' });
});

router.put('/:id', adminOnly, (req, res) => {
  res.json({ message: 'Update exam - Admin only' });
});

router.delete('/:id', adminOnly, (req, res) => {
  res.json({ message: 'Delete exam - Admin only' });
});

// Student routes
router.get('/student/assigned', studentOnly, (req, res) => {
  res.json({ message: 'Get assigned exams - Student only' });
});

export { router as examRoutes };
