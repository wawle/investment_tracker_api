import express from 'express';
import { getStocks } from '../controllers/stocks';


const router = express.Router({ mergeParams: true });

// Get all exhanges 
router
  .route('/')
  .get(getStocks)



export default router;
