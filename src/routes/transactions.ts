import express from 'express';
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction
} from '../controllers/transactions';
import advancedResults from '../middleware/advancedResults';
import Transaction from '../models/Transaction';

const router = express.Router({ mergeParams: true });

// Get all Transactions and create Transaction
router
  .route('/')
  .get(advancedResults(Transaction as any), getTransactions)
  .post(createTransaction);

// Get single Transaction, update Transaction, delete Transaction
router
  .route('/:id')
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);

export default router;
