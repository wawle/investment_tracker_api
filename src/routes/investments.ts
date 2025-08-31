import express from "express";
import {
  getInvestments,
  getInvestment,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  proTotalBalance,
  proMarketBalance,
} from "../controllers/investments";
import advancedResults from "../middleware/advancedResults";
import Investment from "../models/Investment";
import { getInvestmentPrices } from "../controllers/investments";

const router = express.Router({ mergeParams: true });
const { protect } = require("../middleware/auth");

router.use(protect);

// Get all Investments and create Investment
router
  .route("/")
  .get(
    advancedResults(Investment as any, {
      path: "asset",
      select: "name price ticker market currency icon",
    }),
    getInvestments
  )
  .post(createInvestment);

router.route("/prices").get(getInvestmentPrices);

router.route("/total-balance").get(proTotalBalance);

router.route("/market-balance").get(proMarketBalance);

// Get single Investment, update Investment, delete Investment
router
  .route("/:id")
  .get(getInvestment)
  .put(updateInvestment)
  .delete(deleteInvestment);

export default router;
