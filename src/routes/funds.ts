import express from 'express';
import { getFunds } from '../controllers/funds';

const router = express.Router({ mergeParams: true });

// Get all exhanges 
router
  .route('/')
  .get(getFunds)



export default router;
