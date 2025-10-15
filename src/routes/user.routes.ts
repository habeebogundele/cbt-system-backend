import { Router } from 'express';
import { authenticate, adminOnly } from '@/middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin-only routes
router.use(adminOnly);

// Placeholder routes - will be implemented in controllers
router.get('/', (req, res) => {
  res.json({ message: 'Get all users - Admin only' });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create user - Admin only' });
});

router.get('/:id', (req, res) => {
  res.json({ message: 'Get user by ID - Admin only' });
});

router.put('/:id', (req, res) => {
  res.json({ message: 'Update user - Admin only' });
});

router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete user - Admin only' });
});

export { router as userRoutes };
