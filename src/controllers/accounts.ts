import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import ErrorResponse from '../utils/errorResponse';
import Account from '../models/Account';

// @desc      Get all accounts
// @route     GET /api/v1/accounts
// @access    Public
export const getAccounts = asyncHandler(async (req: Request, res: any, next: NextFunction): Promise<void> => {
  res.status(200).json(res.advancedResults);
});

// @desc      Get single account
// @route     GET /api/v1/accounts/:id
// @access    Public
export const getAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const account = await Account.findById(req.params.id);

  if (!account) {
    return next(new ErrorResponse(`Account not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: account
  });
});

// @desc      Create account
// @route     POST /api/v1/accounts
// @access    Public
export const createAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const account = await Account.create(req.body);

  res.status(201).json({
    success: true,
    data: account
  });
});

// @desc      Update account
// @route     PUT /api/v1/accounts/:id
// @access    Public
export const updateAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const account = await Account.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!account) {
    return next(new ErrorResponse(`Account not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: account
  });
});

// @desc      Delete account
// @route     DELETE /api/v1/accounts/:id
// @access    Public
export const deleteAccount = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const account = await Account.findByIdAndDelete(req.params.id);

  if (!account) {
    return next(new ErrorResponse(`Account not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});
