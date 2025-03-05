import { Request, Response, NextFunction } from "express";
import asyncHandler from "../middleware/async";
import ErrorResponse from "../utils/errorResponse";
import History from "../models/History";

// @desc      Get all histories
// @route     GET /api/v1/histories
// @access    Public
export const getHistories = asyncHandler(
  async (req: Request, res: any, next: NextFunction): Promise<void> => {
    res.status(200).json(res.advancedResults);
  }
);

// @desc      Get single history
// @route     GET /api/v1/histories/:id
// @access    Public
export const getHistory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const history = await History.findById(req.params.id);

    if (!history) {
      return next(
        new ErrorResponse(`history not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: history,
    });
  }
);

// @desc      Create history
// @route     POST /api/v1/histories
// @access    Public
export const createHistory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const history = await History.create(req.body);

    res.status(201).json({
      success: true,
      data: history,
    });
  }
);

// @desc      Update history
// @route     PUT /api/v1/histories/:id
// @access    Public
export const updateHistory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const history = await History.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!history) {
      return next(
        new ErrorResponse(`history not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: history,
    });
  }
);

// @desc      Delete history
// @route     DELETE /api/v1/histories/:id
// @access    Public
export const deleteHistory = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const history = await History.findByIdAndDelete(req.params.id);

    if (!history) {
      return next(
        new ErrorResponse(`history not found with id of ${req.params.id}`, 404)
      );
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  }
);
