import express from 'express';
import { getCrypto } from '../controllers/crypto';

const router = express.Router({ mergeParams: true });

// Get all exhanges 
router
  .route('/')
  .get(getCrypto)



export default router;
