import express from "express";

import { protect } from "../middleware/auth";
import {
  getMe,
  login,
  logout,
  register,
  resetPassword,
  updateDetails,
  updatePassword,
} from "../controllers/auth";
import { sendVerificationCodeSMS } from "../controllers/sms";

const router = express.Router({ mergeParams: true });

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/me", protect, getMe);
router.put("/updatedetails", protect, updateDetails);
router.put("/updatepassword", protect, updatePassword);
router.post("/forgotpassword", sendVerificationCodeSMS);
router.put("/resetpassword", resetPassword);

export default router;
