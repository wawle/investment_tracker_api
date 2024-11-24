import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import ErrorResponse from '../utils/errorResponse';
import Transaction from '../models/Transaction';

// @desc      Get all transactions
// @route     GET /api/v1/transactions
// @access    Public
export const getTransactions = asyncHandler(async (req: Request, res: any, next: NextFunction): Promise<void> => {
  res.status(200).json(res.advancedResults);
});

// @desc      Get single transaction
// @route     GET /api/v1/transactions/:id
// @access    Public
export const getTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const transaction = await Transaction.findById(req.params.id);

  if (!transaction) {
    return next(new ErrorResponse(`transaction not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: transaction
  });
});

// @desc      Create transaction
// @route     POST /api/v1/transactions
// @access    Public
export const createTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const transaction = await Transaction.create(req.body);

  res.status(201).json({
    success: true,
    data: transaction
  });
});

// @desc      Update transaction
// @route     PUT /api/v1/transactions/:id
// @access    Public
export const updateTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!transaction) {
    return next(new ErrorResponse(`transaction not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: transaction
  });
});

// @desc      Delete transaction
// @route     DELETE /api/v1/transactions/:id
// @access    Public
export const deleteTransaction = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const transaction = await Transaction.findByIdAndDelete(req.params.id);

  if (!transaction) {
    return next(new ErrorResponse(`transaction not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});
