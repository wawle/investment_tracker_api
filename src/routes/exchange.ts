import express from 'express';
import { getExchanges,getExchangeRates } from '../controllers/exchange';


const router = express.Router({ mergeParams: true });

// Get all exhanges 
router
  .route('/')
  .get(getExchanges)

router
  .route('/rate')
  .get(getExchangeRates)



export default router;
