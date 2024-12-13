import express from "express";
import {
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../controllers/accounts";
import advancedResults from "../middleware/advancedResults";
import Account from "../models/Account";

const router = express.Router({ mergeParams: true });

// Get all Accounts and create Account
router
  .route("/")
  .get(advancedResults(Account as any), getAccounts)
  .post(createAccount);

// Get single Account, update Account, delete Account
router.route("/:id").get(getAccount).put(updateAccount).delete(deleteAccount);

export default router;
