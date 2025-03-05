import { Request, Response } from "express";
import ErrorResponse from "../utils/errorResponse";
import asyncHandler from "../middleware/async";
import User, { IUserModal } from "../models/User"; // Assuming IUser is the User interface
import { RequestWithUser } from "../middleware/auth";
import { sendVerificationCodeSMS } from "./sms";

// Define a type for the request body for registration
interface RegisterRequestBody {
  fullname: string;
  email: string;
  phone: string;
  password: string;
}

// Define a type for the request body for login
interface LoginRequestBody {
  email: string;
  password: string;
}

// @desc      Register user
// @route     POST /api/v1/auth/register
// @access    Public
export const register = asyncHandler(async (req, res) => {
  const { fullname, email, phone, password } = req.body as RegisterRequestBody;

  // Create user
  const user = await User.create({
    fullname,
    email,
    phone,
    password,
  });

  sendTokenResponse(user, 200, res);
});

// @desc      Login user
// @route     POST /api/v1/auth/login
// @access    Public
export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body as LoginRequestBody;

  // Validate phone & password
  if (!email || !password) {
    return next(new ErrorResponse("Please provide an email and password", 400));
  }

  // Check for user
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse("Invalid credentials", 401));
  }

  sendTokenResponse(user, 200, res);
});

// @desc      Log user out / clear cookie
// @route     GET /api/v1/auth/logout
// @access    Private
export const logout = asyncHandler(async (req, res) => {
  res.cookie("token", "none", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc      Get current logged in user
// @route     POST /api/v1/auth/me
// @access    Private
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById((req as RequestWithUser).user.id);

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc      Update user details
// @route     PUT /api/v1/auth/updatedetails
// @access    Private
export const updateDetails = asyncHandler(async (req, res) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
  };

  const user = await User.findByIdAndUpdate(
    (req as RequestWithUser).user.id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc      Update password
// @route     PUT /api/v1/auth/updatepassword
// @access    Private
export const updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById((req as RequestWithUser).user.id).select(
    "+password"
  );

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse("Password is incorrect", 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// @desc      Reset password
// @route     PUT /api/v1/auth/resetpassword
// @access    Public
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { phone, verificationCode, newPassword } = req.body;

  const user = await User.findOne({
    phone,
    verificationCode,
    verificationCodeExpire: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ErrorResponse("Invalid or expired verification code", 400));
  }

  user.password = newPassword;
  user.verificationCode = undefined;
  user.verificationCodeExpire = undefined;
  await user.save();

  sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (
  user: IUserModal,
  statusCode: number,
  res: Response
) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(
      Date.now() +
        parseInt(process.env.JWT_COOKIE_EXPIRE || "7") * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: false,
  };

  if (process.env.NODE_ENV === "production") {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
      },
    });
};
