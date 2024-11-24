import express from 'express';
import { getCommodities } from '../controllers/commodity';

const router = express.Router({ mergeParams: true });

// Get all exhanges 
router
  .route('/')
  .get(getCommodities)



export default router;
