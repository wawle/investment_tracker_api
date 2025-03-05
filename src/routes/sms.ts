import express from "express";
import {
  sendVerificationCodeSMS,
  verifyVerificationCodeSMS,
} from "../controllers/sms";

const router = express.Router({ mergeParams: true });

// Get all exhanges
router.route("/send-verification-code").post(sendVerificationCodeSMS);
router.route("/verify-verification-code").post(verifyVerificationCodeSMS);

export default router;
