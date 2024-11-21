
import { NextFunction, Request, Response } from "express";
import asyncHandler from "../middleware/async";
import User from "../models/User";

// @desc      Register user
// @route     POST /api/v1/auth/register
// @access    Public
export const register = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { fullname, email } = req.body;

    // Create user
    const user = await User.create({
      fullname,
      email
    });

    res.status(201).json({
      success: true,
      data: user
    });
  }
);



// @desc      Get current logged in user
// @route     GET /api/v1/auth/me/:id
// @access    Public
export const getMe = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Assuming req.user.id is typed
    const user = await User.findById(req.params.id);

    res.status(200).json({
      success: true,
      data: user
    });
  }
);
