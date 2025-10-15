import { Router } from 'express';
import { authenticate, adminOnly } from '@/middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/image', (req, res) => res.json({ message: 'Upload image' }));
router.post('/document', adminOnly, (req, res) => res.json({ message: 'Upload document - Admin' }));
router.post('/bulk-import', adminOnly, (req, res) => res.json({ message: 'Bulk import - Admin' }));

export { router as uploadRoutes };
