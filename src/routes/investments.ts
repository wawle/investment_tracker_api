import express from 'express';
import {  getInvestmentsByAccountId } from '../controllers/investments';

const router = express.Router({ mergeParams: true });

// Get single account, update account, delete account
router
  .route('/:accountId').get(getInvestmentsByAccountId)

export default router;
