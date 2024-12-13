import express from "express";
import {
  getInvestments,
  getInvestment,
  createInvestment,
  updateInvestment,
  deleteInvestment,
} from "../controllers/investments";
import advancedResults from "../middleware/advancedResults";
import Investment from "../models/Investment";
import { getInvestmentPrices } from "../controllers/investments";

const router = express.Router({ mergeParams: true });

// Get all Investments and create Investment
router
  .route("/")
  .get(advancedResults(Investment as any), getInvestments)
  .post(createInvestment);

router.route("/prices").get(getInvestmentPrices);

// Get single Investment, update Investment, delete Investment
router
  .route("/:id")
  .get(getInvestment)
  .put(updateInvestment)
  .delete(deleteInvestment);

export default router;
