import { NextFunction, Request, Response } from "express";
import asyncHandler from "../middleware/async";

import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// @desc      Send Verification Code SMS
// @route     POST /api/v1/sms/send-verification-code
// @access    Public
export const sendVerificationCodeSMS = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const response = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID as string)
      .verifications.create({ to: req.body.to, channel: "sms" });

    res.status(201).json({
      success: true,
      data: response,
    });
  }
);

// @desc      Verify Verification Code SMS
// @route     POST /api/v1/sms/verify-verification-code
// @access    Public
export const verifyVerificationCodeSMS = asyncHandler(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const response = await client.verify.v2
      .services(process.env.TWILIO_SERVICE_SID as string)
      .verificationChecks.create({ to: req.body.to, code: req.body.code });

    res.status(201).json({
      success: true,
      data: response,
    });
  }
);
