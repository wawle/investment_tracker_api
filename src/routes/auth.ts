import express from 'express';
import {
  register,
  getMe,
} from '../controllers/auth';

const router = express.Router();

// Register route
router.post('/register', register);

// Get current user route 
router.get('/me/:id', getMe);

export default router;





