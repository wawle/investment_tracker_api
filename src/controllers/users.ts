import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import asyncHandler from '../middleware/async';
import ErrorResponse from '../utils/errorResponse';

// @desc      Get all users
// @route     GET /api/v1/users
// @access    Public
export const getUsers = asyncHandler(async (req: Request, res: any, next: NextFunction): Promise<void> => {
  res.status(200).json(res.advancedResults);
});

// @desc      Get single user
// @route     GET /api/v1/users/:id
// @access    Public
export const getUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc      Create user
// @route     POST /api/v1/users
// @access    Public
export const createUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user
  });
});

// @desc      Update user
// @route     PUT /api/v1/users/:id
// @access    Public
export const updateUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc      Delete user
// @route     DELETE /api/v1/auth/users/:id
// @access    Public
export const deleteUser = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});
