import express from "express";
import { getMarketData } from "../controllers/scraping";
import { priceSetter } from "../utils/price-setter";

const router = express.Router({ mergeParams: true });

// Get single account, update account, delete account
router.route("/").get(getMarketData);

router.route("/setter").get(priceSetter);

export default router;
