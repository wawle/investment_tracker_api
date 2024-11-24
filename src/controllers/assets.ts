import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../middleware/async';
import ErrorResponse from '../utils/errorResponse';
import Asset from '../models/Asset';
import constants from '../utils/constants';

// @desc      Get all assets
// @route     GET /api/v1/assets
// @access    Public
export const getAssets = asyncHandler(async (req: Request, res: any, next: NextFunction): Promise<void> => {
  res.status(200).json(res.advancedResults);
});

// @desc      Get single asset
// @route     GET /api/v1/assets/:id
// @access    Public
export const getAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const asset = await Asset.findById(req.params.id);

  if (!asset) {
    return next(new ErrorResponse(`asset not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: asset
  });
});

// @desc      Create asset
// @route     POST /api/v1/assets
// @access    Public
export const createAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const asset = await Asset.create(req.body);

  res.status(201).json({
    success: true,
    data: asset
  });
});

// @desc      Update asset
// @route     PUT /api/v1/assets/:id
// @access    Public
export const updateAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!asset) {
    return next(new ErrorResponse(`asset not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: asset
  });
});

// @desc      Delete asset
// @route     DELETE /api/v1/assets/:id
// @access    Public
export const deleteAsset = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const asset = await Asset.findByIdAndDelete(req.params.id);

  if (!asset) {
    return next(new ErrorResponse(`asset not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: {}
  });
});



// @desc      Get single asset
// @route     GET /api/v1/assets/types
// @access    Public
export const getAssetTypes = asyncHandler(async (req: Request, res: Response, next: NextFunction): Promise<void> => {


  res.status(200).json({
    success: true,
    data: constants.asset_type_list
  });
});